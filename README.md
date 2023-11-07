# Semantic image search using Amazon Titan Multi-Modal model

## Deploying the full stack application

![Architecture diagram - Semantic Image search](arch-diagram-semantic-image-search.png?raw=true "Architecture diagram - Semantic Image search")

These following steps talk through the sequence of actions that enable semantic image and celebrity search.
1.	You upload an image to an Amazon Simple Storage Service (Amazon S3) bucket
2.	Amazon EventBridge listens to this event, and then triggers an AWS Step function execution
3.	The Step Function takes the image Amazon S3 details and runs 3 parallel actions
1.	API call to Amazon Rekognition DetectLabels to extract object metadata
2.	API call to Amazon Rekognition RecognizeCelebrities APIs to extract any known celebrities
3.	AWS Lambda resizes the image to accepted max dimensions for the model and generates an embedding direct from the image input
4.	The Lambda function then inserts the image object metadata and celebrity name(s) if present, and the embedding as a k-NN vector into an OpenSearch Service index
5.	Amazon S3 hosts a simple static website, served by an Amazon CloudFront distribution. The front-end user interface (UI) allows you to authenticate with the application using Amazon Cognito to search for images
6.	You submit an article or some text via the UI
7.	Another Lambda function calls Amazon Comprehend to detect any names in the text as potential celebrities
8.	The function then summarizes the text to get the pertinent points from the article
9.	The function generates an embedding of the summarized article
10.	The function then searches OpenSearch Service image index for any image matching the celebrity name and the k-nearest neighbors for the vector using cosine similarity
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
    
### Deployment

**This deployment is currently set up to deploy into the us-east-1 region. Please check Amazon Bedrock region availability and update the samconfig.toml file to reflect your desired region.**

You can run these commands from your command line/terminal, or you could even use AWS Cloud9. 

```bash
git clone https://github.com/aws-samples/semantic-image-search-for-articles.git
cd aws-semantic-image-search
```

The deployment of the solution is achieved with 2 commands:

```bash
npm install
```

Once the packages are downloaded:

```bash
npm audit
```
If issues present, run this:

```bash
npm audit fix
```

Once the packages are downloaded:

```bash
npm run deploy
```

This command will run a series of scripts such as sam build, sam deploy and a few others to set up the front end environment with the correct variables.

### Create login details for the web application
The authenication is managed by Amazon Cognito. You will need to create a new user to be able to login. 

You can find the userpool id from the cloudformation output and choose that userpool and create a new user there to login with.

### Login to your new web application

Once complete, the CLI output will show a value for the CloudFront url to be able to view the web application, e.g. https://d123abc.cloudfront.net/

## Administration

The Web App allows the user to upload images to S3 and be indexed by OpenSearch as well as issuing queries to OpenSearch to return the top 10 images that are most semantically related to the article content.

If there is a need to change the indexed documents in OpenSearch this can be achieved by interacting with OpenSearch through its Kibana Dashboard and the Dev tools within that.

The Kibana dashboard URL is another of the Outputs shown in the CloudFormation Stack and the user credentials for accessing it as held in Secrets Manager with the name of the secret used provided in the Stack outputs


Be sure to:

* Edit your repository description on GitHub

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

