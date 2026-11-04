"""AWS Lambda Function: Mission Dispatcher.
Invoked by Amazon API Gateway: POST /missions/assign
"""
import json
import os
import boto3

dynamodb = boto3.resource("dynamodb")
iot_data = boto3.client("iot-data")
TABLE_PREFIX = os.environ.get("AWS_DYNAMODB_PREFIX", "resqfly")

def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        mission_id = body.get("id")
        drone_id = body.get("assigned_drone_id")

        if not mission_id or not drone_id:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "Missing mission_id or assigned_drone_id"})
            }

        # 1. Store Mission in DynamoDB
        missions_table = dynamodb.Table(f"{TABLE_PREFIX}-missions")
        missions_table.put_item(Item=body)

        # 2. Publish Dispatch Command via AWS IoT Core
        command_topic = f"resqfly/drone/{drone_id}/command"
        iot_data.publish(
            topic=command_topic,
            qos=1,
            payload=json.dumps({
                "action": "START_MISSION",
                "mission_id": mission_id,
                "target_location": body.get("target_location"),
                "calculated_route": body.get("calculated_route", [])
            })
        )

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"status": "dispatched", "mission_id": mission_id, "drone_id": drone_id})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(e)})
        }
