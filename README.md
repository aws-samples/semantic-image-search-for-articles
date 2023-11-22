# Semantic image search using Amazon Titan Multi-Modal model

Digital publishers are continuously looking for ways to streamline and automate their media workflows to generate and publish new content as rapidly as they can, but without foregoing quality.
Adding images to capture the essence of text can improve the reading experience. Machine learning techniques can help you discover such images. ![https://www.journalism.co.uk/news/five-rules-to-make-your-article-images-more-engaging/s2/a789231/](“A striking image is one of the most effective ways to capture audiences' attention and create engagement with your story - but it also has to make sense”). 

In this aws-samples project, you see how you can use Amazon Titan foundation models to understand an article and find the best images to accompany it, with a click of a button. The Titan multimodal embeddings model can generate an embedding of an image or text or both.

A key concept in semantic search is embeddings. An embedding is a numerical representation of some input - in this case an image, or text or both, in the form of a vector. When you have many vectors, you can measure the distance between them, and vectors which are close in distance are semantically similar or related.

## Deploying the full stack application

![Architecture diagram - Semantic Image search](arch-diagram-semantic-image-search.png?raw=true "Architecture diagram - Semantic Image search")

These following steps talk through the sequence of actions that enable semantic image and celebrity search.
1.	You upload an image to an Amazon S3 bucket
2.	Amazon EventBridge listens to this event, and then triggers an AWS Step function execution
3.	The Step Function takes the Amazon S3 image details and runs 3 parallel actions
1.	API call to Amazon Rekognition DetectLabels to extract object metadata
2.	API call to Amazon Rekognition RecognizeCelebrities APIs to extract any known celebrities
3.	AWS Lambda resizes the image to accepted max dimensions for the ML embedding model and generates an embedding direct from the image input
4.	The Lambda function then inserts the image object metadata and celebrity name(s) if present, and the embedding as a k-NN vector into an OpenSearch Service index
5.	Amazon S3 hosts a simple static website, distributed by an Amazon CloudFront. The front-end user interface (UI) allows you to authenticate with the application using Amazon Cognito to search for images
6.	You submit an article or some text via the UI
7.	Another Lambda function calls Amazon Comprehend to detect any names in the text as potential celebrities
8.	The function then summarizes the text to get the pertinent points from the article Using Titan Text G1 - Express
9.	The function generates an embedding of the summarized article using the Titan multimodal model.
10.	The function then searches OpenSearch Service image index for images matching the celebrity name and the k-nearest neighbors for the vector using cosine similarity, using Exact k-NN with scoring script. 
11.	Amazon CloudWatch and AWS X-Ray give you observability into the end-to-end workflow to alert you of any issues.


### Pre-requisites

- SAM cli

    The solution uses the [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) for deployment.
    **Make sure to be using latest version of SAM cli**

- Docker

    The solution uses the SAM CLI option to build inside a container to avoid the need for local dependencies. You will need docker available for this.

- Node

    The front end for this solution is a React web application that can be run locally using Node

- npm

    The installation of the packages required to run the web application locally, or build it for remote deployment, require npm.  

### Amazon Bedrock requirements
**Base Models Access**

If you are looking to interact with models from Amazon Bedrock, you need to [request access to the base models in one of the regions where Amazon Bedrock is available](https://console.aws.amazon.com/bedrock/home?#/modelaccess). Make sure to read and accept models' end-user license agreements or EULA.

| Model | Max Token Input | Embedding Dimension | Price for 1K input token | Price for 1K out token | 
| ------------ | ------- | ----- | ---- | ----- |
| Amazon Multimodal Embeddings | 100 | 1024 | $TBC | n/a |

When we summarize the model, we can specify the max output tokens, and this insures that we pass in less than 100 tokens to the embedding model. 

The multimodal embedding model also has a max dimension size which we handle as part of the image embedding lambda function. 

Note:
- You can deploy the solution to a different region from where you requested Base Model access.
- **While the Base Model access approval is instant, it might take several minutes to get access and see the list of models in the UI.**      
    
### Deployment

**This deployment is currently set up to deploy into the us-east-1 region. Please check Amazon Bedrock region availability and update the samconfig.toml file to reflect your desired region.**

### Environment setup

#### Deploy with AWS Cloud9
We recommend deploying with [AWS Cloud9](https://aws.amazon.com/cloud9/). 
If you'd like to use Cloud9 to deploy the solution, you will need the following before proceeding:
- select at least `m5.large` as Instance type.
- use `Amazon Linux 2` as the platform.

You can run these commands from your command line/terminal, or you could use AWS Cloud9. 

1. Clone the repository

```bash
git clone https://github.com/aws-samples/semantic-image-search-for-articles.git
```

2. Move into the cloned repository
```bash
cd aws-semantic-image-search
```

#### (Optional) Only for Cloud9
If you use Cloud9, increase the instance's EBS volume to at least 50GB. 
To do this, run the following command from the Cloud9 terminal:
```
./scripts/cloud9-resize.sh
```
See the documentation for more details [on environment resize](https://docs.aws.amazon.com/cloud9/latest/user-guide/move-environment.html#move-environment-resize). 


Review this file: samconfig.toml

Here you can name your stack, and pick the region you want to deploy in. 
*Line 19 - ``` region = "us-east-1" ``` *
Check if the AWS services are all available in the region you are choosing. 

As the deployment will deploy Amazon CloudFront, this can take approximately 20 minutes. 

Cloud9 generates STS token's to do the deployment, however, these credentials only last 15 minutes, therefore the token will expire before the deployment is complete, and therefore you won't be able to see the outputs directly from Cloud9. 

[How to Authenticate with short-term credentials](https://docs.aws.amazon.com/cli/latest/userguide/cli-authentication-short-term.html)
You can export the access key tokens, making sure they last at least 30 minutes or 1800 seconds:
```bash
export AWS_ACCESS_KEY_ID= <PASTE_ACCESS_KEY>
export AWS_SECRET_ACCESS_KEY= <PASTE_SECRET_ACCESS_KEY>
export AWS_SESSION_TOKEN= <PASTE_SESSION_TOKEN>
```

(If the tokens do expire, you can leave the deployment to complete, checking progress within CloudFormation, and then re-run the deployment script below - as the Amazon CloudFront resource will already exist, the deployment will complete quickly)

### Run the deployment of the application

The deployment of the solution is achieved with the following command:

```bash
npm install && npm run deploy
```

This command will run a series of scripts such as sam build, sam deploy and a few others to set up the front end environment with the correct variables.

### Create login details for the web application
The authenication is managed by Amazon Cognito. You will need to create a new user to be able to login. 

You can find the userpool id from the cloudformation output and choose that userpool and create a new user there to login with.

### Login to your new web application

Once complete, the CLI output will show a value for the CloudFront url to be able to view the web application, e.g. https://d123abc.cloudfront.net/ - you can also see this in the CloudFormation outputs.

## Administration

The Web App allows the user to upload images to S3 and be indexed by OpenSearch as well as issuing queries to OpenSearch to return the top 10 images that are most semantically related to the article content.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

