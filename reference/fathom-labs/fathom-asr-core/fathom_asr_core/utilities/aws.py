import boto3
import fathom_asr_core as core

class AWS:

    def __init__(self):
        self.allowed_regions = ['us-west-2', 'us-east-2', 'us-west-1']
        self.ec2_clients = []
        for region in self.allowed_regions:
            self.ec2_clients.append(self.ec2_client(region))

    def ec2_client(self, region):
        return boto3.client(
            "ec2", 
            region_name=region, 
            aws_access_key_id=core.env["aws_access_key"], 
            aws_secret_access_key=core.env["aws_access_secret"]
            )

    def terminate_instance(self, instance_id):
        '''
        Terminate spot instances with CUDA out of memory error
        '''
        for client in self.ec2_clients:
            instance_descrption = client.describe_instances(
                Filters=[
                    {   
                        'Name': 'instance-id',
                        'Values': [instance_id]
                    },
                ],
            )
            if len(instance_descrption['Reservations']) > 0:
                terminated_instance = client.terminate_instances(InstanceIds=([instance_id]))
                break
