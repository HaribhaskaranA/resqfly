"""AWS Lambda Function: Alert & Incident Notifier.
Triggered by DynamoDB Streams or Direct Invocation for Critical Shelter/Disaster Alerts.
"""
import json
import os
import boto3

sns = boto3.client("sns")
SNS_TOPIC_ARN = os.environ.get("AWS_SNS_ALERTS_TOPIC_ARN")

def lambda_handler(event, context):
    try:
        alert_data = event
        if "body" in event:
            alert_data = json.loads(event["body"])

        level = alert_data.get("level", "warning")
        title = alert_data.get("title", "Disaster Alert")
        message = alert_data.get("message", "")

        # If Critical Alert and SNS topic configured, notify rescue coordinators
        if level == "critical" and SNS_TOPIC_ARN:
            sns.publish(
                TopicArn=SNS_TOPIC_ARN,
                Subject=f"[RESQFLY CRITICAL] {title}",
                Message=f"URGENT DISASTER NOTIFICATION:\n\n{message}\n\nReview immediately in RESQFLY Operations Center."
            )

        return {
            "statusCode": 200,
            "body": json.dumps({"status": "alert_dispatched", "title": title})
        }
    except Exception as e:
        return {"statusCode": 500, "body": str(e)}
