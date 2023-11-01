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

    "aws_project_region": "{Region}",
    "aws_cognito_region": "{Region}",
    "aws_appsync_region": "{Region}",
    "aws_user_files_s3_bucket_region": "{Region}",

    "aws_user_files_s3_bucket": "{S3Bucket}",
    "aws_cloud_logic_custom": [
        {
            "name": "api",
            "endpoint": "{Endpoint}",
        }
    ],
    "aws_user_pools_id": "{UserPoolsId}",
    "aws_cognito_identity_pool_id": "{IdentityPoolId}",
    "aws_user_pools_web_client_id": "{UserPoolsWebClientId}",

    "cloudfront_url": "{CloudFrontUrl}",
};

export default config;
