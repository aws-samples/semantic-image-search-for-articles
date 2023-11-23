import os
import json

import boto3
import awswrangler as wr

import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

sec = boto3.client("secretsmanager")
get_secret_value = sec.get_secret_value(SecretId=os.environ["OPENSEARCH_SECRET"])
secret_value = json.loads(get_secret_value["SecretString"])


bedrock = boto3.client("bedrock-runtime")

os_client = wr.opensearch.connect(
    host=os.environ["OPENSEARCH_ENDPOINT"],
    username=secret_value["username"],
    password=secret_value["password"],
)


def get_names(payload):
    comprehend = boto3.client("comprehend")
    response = comprehend.detect_entities(Text=payload, LanguageCode="en")
    names = ""
    for entity in response["Entities"]:
        if entity["Type"] == "PERSON":
            names += entity["Text"] + " "
    return names


def summarise_article_titan(payload):
    prompt = f"""Please provide a summary of the following text. Do not add any information that is not mentioned in the text below.
    <text>
    {payload}
    <text>"""
    body = json.dumps(
        {
            "inputText": prompt,
            "textGenerationConfig": {
                "maxTokenCount": 99,  # Max tokens input for embedding model 
                "stopSequences": [],
                "temperature": 0,
                "topP": 1,
            },
        }
    )
    response = bedrock.invoke_model(
        body=body,
        modelId="amazon.titan-text-express-v1",
        accept="application/json",
        contentType="application/json",
    )
    response_body = json.loads(response.get("body").read())
    answer = response_body.get("results")[0].get("outputText")
    logger.info('## SUMMARIZED')
    logger.info(f'Response: "{answer}"')
    return answer


def get_vector_titan(payload_summary):

    body = json.dumps({"inputText": payload_summary})
    #todo check model id
    response = bedrock.invoke_model(
        body=body,
        modelId="amazon.titan-embed-image-v1",
        accept="application/json",
        contentType="application/json",
    )
    response_body = json.loads(response.get("body").read())
    embedding = response_body.get("embedding")
    return embedding


def index_document(document):
    # Create Index, generates a warning if index already exists
    wr.opensearch.create_index(
        client=os_client,
        index="images",
        settings={
            "index.knn": True,
            "index.knn.space_type": "cosinesimil",
            "analysis": {
                "analyzer": {"default": {"type": "standard", "stopwords": "_english_"}}
            },
        },
        mappings={
            "properties": {
                "image_vector": {
                    "type": "knn_vector",
                    "dimension": len(document["image_vector"]),
                    "store": True,
                },
                "image_path": {"type": "text", "store": True},
                "image_words": {"type": "text", "store": True},
                "celebrities": {"type": "text", "store": True},
            }
        },
    )

    response = wr.opensearch.index_documents(
        client=os_client,
        index="images",
        documents=[document],
    )
    return


def search_document_vector(vector):
    results = wr.opensearch.search(
        client=os_client,
        index="images",
        filter_path=["hits.hits._id", "hits.hits._source", "hits.hits._score"],
        explain=True,
        search_body={
            "query": {
                "knn": {"image_vector": {"vector": vector, "k": 10}},
            },
        },
    )
    return results.drop(columns=["image_vector"]).to_dict()


def search_document_celeb_context(person_names, vector):
    results = wr.opensearch.search(
        client=os_client,
        index="images",
        search_body={
            "size": 10,
            "query": {
                "script_score": {
                    "query": {"match": {"celebrities": person_names}},
                    "script": {
                        "lang": "knn",
                        "source": "knn_score",
                        "params": {
                            "field": "image_vector",
                            "query_value": vector,
                            "space_type": "cosinesimil",
                        },
                    },
                }
            },
        },
    )
    if results.empty:
        res = search_document_vector(vector)
    else:
        res = results.drop(columns=["image_vector"]).to_dict()
    return res


def lambda_handler(event, context):

    if "ImageText" in event:
        metad = (
            event["ImageText"]["Sentence_labels"]
            + " "
            + event["ImageText"]["Sentence_people"]
        )

        vector = event["ImageText"]["Image_embedding"]
        os_document = {
            "image_path": f"s3://{event['detail']['bucket']['name']}/{event['detail']['object']['key']}",
            "image_words": event["ImageText"]["Sentence_labels"],
            "celebrities": event["ImageText"]["Sentence_people"],
            "image_vector": vector,
        }
        index_document(os_document)
        return {"Vector": vector}
    elif event["httpMethod"] == "POST":
        if len(event["body"]) > 20000:
            logger.info('## Text too long')            
            return {"statusCode": 400, "body": json.dumps("Text too long")}
        else:
            person_names = get_names(event["body"])
            summarize_text = summarise_article_titan(event["body"])
            # summarized_text = {"text_inputs": [summarize_text]}
            vector = get_vector_titan(summarize_text)
            if len(person_names) > 0:
                os_results = search_document_celeb_context(person_names, vector)
                results = [
                    {k: os_results[k][n] for k in os_results.keys()}
                    for n in os_results[list(os_results.keys())[0]].keys()
                ] 
            else:
                os_results = search_document_vector(vector)
                results = [
                    {k: os_results[k][n] for k in os_results.keys()}
                    for n in os_results[list(os_results.keys())[0]].keys()
                ]
            return {
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Methods": "*",
                },
                "body": json.dumps({"results": results}),
            }
