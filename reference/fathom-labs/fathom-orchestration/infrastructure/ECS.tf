resource "aws_ecs_cluster" "main" {
  name = "fathom-orchestration"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

data "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole"
}

resource "aws_cloudwatch_log_group" "main" {
  for_each = local.queues
 
  name = "/ecs/fathom-orchestration-worker_${each.key}"
}

resource "aws_ecs_task_definition" "queue_worker" {
  for_each = local.queues

  family                   = "fathom-orchestration-worker_${each.key}"
  cpu                      = each.value.cpu
  memory                   = each.value.memory

  task_role_arn            = data.aws_iam_role.ecs_task_execution_role.arn
  execution_role_arn       = data.aws_iam_role.ecs_task_execution_role.arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]

  container_definitions = jsonencode(
    [
        {
            "name": "worker"
            "image": "410192009209.dkr.ecr.us-east-1.amazonaws.com/fathom-orchestration:latest",
            "cpu": each.value.cpu,
            "memory": each.value.memory,
            "memoryReservation": each.value.memory,
            "portMappings": [],
            "command": [
                "/app/start-worker.sh", 
                each.key
            ]
            "environment": [
                {
                    "name": "PAPERTRAIL_ADDRESS",
                    "value": "${local.papertrail_address}"
                },
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/fathom-orchestration-worker_${each.key}",
                    "awslogs-region": "us-east-1",
                    "awslogs-stream-prefix": "ecs"
                }
            }
        }
    ]
  )
}

resource "aws_ecs_service" "queue_service" {
  for_each = local.queues
 
  name                               = "fathom-orchestration-worker_${each.key}"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.queue_worker[each.key].arn
  desired_count                      = 1
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100
  launch_type                        = "FARGATE"
  scheduling_strategy                = "REPLICA"
  enable_ecs_managed_tags            = true
  wait_for_steady_state              = true
  
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
    
  network_configuration {
    security_groups  = local.security_group_ids
    subnets          = local.subnet_ids
    assign_public_ip = true
  }
 
  lifecycle {
    ignore_changes = [desired_count]
  }
}

resource "aws_appautoscaling_target" "main" {
  for_each = local.queues
  
  resource_id = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.queue_service[each.key].name}"

  min_capacity = each.value.min_capacity
  max_capacity = each.value.max_capacity

  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  for_each = local.queues
  
  name = "CPU"
  policy_type = "TargetTrackingScaling"
  resource_id = aws_appautoscaling_target.main[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.main[each.key].scalable_dimension
  service_namespace = aws_appautoscaling_target.main[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value = each.value.cpu_scale_up_threshold
  }
}

