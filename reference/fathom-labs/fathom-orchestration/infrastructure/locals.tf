locals {
  fathom_orchestration_version  = "1.0.0"
  
  queues = {
    "episode_processing" = {
      cpu = 512
      memory = 1024 * 2
      min_capacity = 2
      max_capacity = 2
    },
    "podcast_processing" = {
      cpu = 1024
      memory = 1024 * 4
      min_capacity = 6
      max_capacity = 6
    },
    "podium_package_processing" = {
      cpu = 256
      memory = 1024 * 2
      min_capacity = 16
      max_capacity = 16
    },
  }

  papertrail_address = "logs6.papertrailapp.com 44233"
  datadog_api_key = "720ac3714be0763239a2704b49967ceb"
  vpc_id = "vpc-015f2519fedfbb041"
  security_group_ids = ["sg-040f88432dfd1e128"]
  subnet_ids = [
    "subnet-00f0e48e09b290873",
    "subnet-01c4656e7e5634b83",
    "subnet-02b5d74dff1093f92",
    "subnet-07c20fff416dbde71"
  ]
}