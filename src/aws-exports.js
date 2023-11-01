const config = {
    "oauth": {},
    "aws_cognito_username_attributes": [],
    "aws_cognito_social_providers": [],
    "aws_cognito_signup_attributes": [],
    "aws_cognito_mfa_configuration": "OFF",
    "aws_cognito_mfa_types": [
        "SMS"
    ],
    "aws_cognito_password_protection_settings": {
        "passwordPolicyMinLength": 8,
        "passwordPolicyCharacters": []
    },
    "aws_cognito_verification_mechanisms": [],
    "aws_appsync_authenticationType": "AMAZON_COGNITO_USER_POOLS",

    "aws_project_region": "us-east-1",
    "aws_cognito_region": "us-east-1",
    "aws_appsync_region": "us-east-1",
    "aws_user_files_s3_bucket_region": "us-east-1",

    "aws_user_files_s3_bucket": "semantic-v6-bucket-1wyccfcxjfdn2",
    "aws_cloud_logic_custom": [
        {
            "name": "api",
            "endpoint": "https://03rggtjwn8.execute-api.us-east-1.amazonaws.com/Prod",
        }
    ],
    "aws_user_pools_id": "us-east-1_oWjrm6y3j",
    "aws_cognito_identity_pool_id": "us-east-1:237cb74c-23dc-4d68-9d10-1ded39f4ae07",
    "aws_user_pools_web_client_id": "15k2i3s2dlr22fpm5vfkjqfas",

    "cloudfront_url": "https://d2dvw5hcntvm7m.cloudfront.net",
};

export default config;
