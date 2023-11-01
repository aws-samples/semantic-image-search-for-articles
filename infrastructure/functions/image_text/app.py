import json


def lambda_handler(event, context):

    labels = ""
    for c in event["Metadata"][0]["Label_Results"]:
        if c["Confidence"] > 80:
            labels += c["Name"] + " "
    if len(labels.split()) > 4:
        results_labels = labels
    else:
        results_labels = None

    celebs = ""
    for c in event["Metadata"][1]["Celebrity_Results"]:
        if c["MatchConfidence"] > 80:
            celebs += c["Name"] + " "
    results_people = celebs

    embedding = event["Metadata"][2]["Embedding_Results"]

    return {
        "Sentence_labels": results_labels,
        "Sentence_people": results_people,
        "Embedding": embedding,
    }
