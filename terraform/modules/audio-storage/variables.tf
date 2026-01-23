variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, prd)"
  type        = string
}

variable "location" {
  description = "Storage bucket location"
  type        = string
  default     = "asia-northeast1"
}

variable "cors_origins" {
  description = "Allowed CORS origins for audio playback"
  type        = list(string)
  default     = ["*"]
}

variable "service_account_email" {
  description = "Service account email that will upload audio files"
  type        = string
}
