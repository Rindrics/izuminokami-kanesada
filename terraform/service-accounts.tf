resource "google_service_account" "tts_prd" {
  account_id   = "tts-service-account-production"
  display_name = "TTS Service Account production"
  description  = "Text-to-speech Service Account for production environment"
}

# IAM role bindings for the service account

# Cloud Text-to-Speech API User
resource "google_project_iam_member" "tts_prd_tts_user" {
  project = var.project_id
  role    = "roles/cloudtexttospeech.user"
  member  = "serviceAccount:${google_service_account.tts_prd.email}"
}

# Storage Object Admin (for Firebase Storage)
resource "google_project_iam_member" "tts_prd_storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.tts_prd.email}"
}

# Output the service account email
output "tts_prd_service_account_email" {
  description = "Email of the TTS production service account"
  value       = google_service_account.tts_prd.email
}
