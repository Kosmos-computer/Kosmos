from prefect import Client

from time import sleep

def get_flow_groups():
    query = """
        query {
            flow (distinct_on: [name, flow_group_id]) {
                name
                flow_group_id
            }
        }
    """

    resp = Client().graphql(query)
    return list(resp.data.flow)

def get_latest_flow_id(flow_group_id):
    query = """
        query ($flow_group_id: uuid) {
            flow (limit: 1, order_by: {version: desc}, where: {flow_group_id: {_eq: $flow_group_id}}) {
                id
            }
        }
    """

    resp = Client().graphql(query, variables={"flow_group_id": flow_group_id})
    return resp.data.flow[0].id

def count_running_flows(flow_name):
    query = """
        query($flow_name: String) {
            flow_run_aggregate(
                where: {flow: { name: {_eq: $flow_name}}, state: {_in: ["Running", "Pending", "Scheduled", "Submitted"]}}
            ) {
                aggregate 
                {
                    count
                }
            }
        }

    """

    resp = Client().graphql(query, variables={"flow_name": flow_name})
    return resp.data.flow_run_aggregate.aggregate.count

def running_flow_count_exceeds(flow_name, max_count):
    count = count_running_flows(flow_name)
    if count > max_count:
        return True
        
    sleep(2) # Need to check again to minimize race conditions
    count = count_running_flows(flow_name)
    if count > max_count:
        return True

    return False

def flow_is_not_running(flow_name):
    count = count_running_flows(flow_name)
    if count > 0:
        return False
        
    sleep(2) # Need to check again to minimize race conditions
    count = count_running_flows(flow_name)
    if count > 0:
        return False

    return True