import os, boto3

env_vars = {}
with open('C:/Users/HARIBHASKARAN A/.gemini/antigravity/scratch/resqfly/backend/.env') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env_vars[k.strip()] = v.strip().strip('"').strip("'")

session = boto3.Session(
    aws_access_key_id=env_vars.get('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=env_vars.get('AWS_SECRET_ACCESS_KEY'),
    region_name='ap-southeast-2'
)

dynamodb = session.resource('dynamodb', region_name='ap-southeast-2')
tables = ['resqfly_missions', 'resqfly_missions_org', 'resqfly_telemetry', 'resqfly_telemetry_org', 'resqfly_users']

for name in tables:
    try:
        t = dynamodb.Table(name)
        res = t.scan()
        print(f"=== Table: {name} (Count: {res.get('Count', 0)}) ===")
        for item in res.get('Items', []):
            print("  ", item)
    except Exception as e:
        print(f"Error scanning {name}: {e}")
