import os
import json
import base64
import boto3
from PIL import Image

s3 = boto3.client("s3")
bedrock = boto3.client("bedrock-runtime")

def resize_image(photo, bucket, width, height):
    
    Image.MAX_IMAGE_PIXELS = 100000000
    
    with Image.open(photo) as image:    
        
        if image.format in ["JPEG", "PNG"]:
            file_type = image.format.lower()
            path = image.filename.rsplit(".", 1)[0]

            image.thumbnail((width, height))
            image.save(f"{path}-resized.{file_type}")

            fileshort = os.path.basename(path)

            s3.upload_file(
                f"{path}-resized.{file_type}",
                bucket,
                f"resized/{fileshort}-resized.{file_type}",
                ExtraArgs={"ContentType": f"image/{file_type}"},
            )
            
        else:
            raise Exception("Unsupported image format")
        
    return fileshort, file_type, path

def get_vector_titan_multi_modal(path, file_type):
    # MAX image size supported is 2048 * 2048 pixels

    with open(f"{path}-resized.{file_type}", "rb") as image_file:
        input_image = base64.b64encode(image_file.read()).decode("utf8")

    # You can specify either text or image or both
    body = json.dumps({"inputImage": input_image})

    response = bedrock.invoke_model(
        body=body,
        modelId="amazon.titan-e1m-medium",
        accept="application/json",
        contentType="application/json",
    )
    response_body = json.loads(response.get("body").read())
    embedding = response_body.get("embedding")
    return embedding


def lambda_handler(event, context):
    # Download S3 image to local

    bucket = event["body"]["bucket"]
    key = event["body"]["key"]

    fileshort = os.path.basename(key)

    file_tmp = "/tmp/" + fileshort

    s3.download_file(bucket, key, file_tmp)

    width = 2048
    height = 2048

    fileshort, file_type, path = resize_image(file_tmp, bucket, width, height)

    embedding = get_vector_titan_multi_modal(path, file_type)

    return {
        "statusCode": 200,
        "body": json.dumps("Image resized and saved to s3!"),
        "bucket": bucket,
        "key": f"resized/{fileshort}-resized.{file_type}",
        "embedding": embedding,
    }
