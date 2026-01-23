# Firebase/Cloud Storage bucket for audio files
#
# Note: Firebase Storage uses Cloud Storage under the hood.
# The bucket will be accessible via Firebase Admin SDK.

resource "google_storage_bucket" "audio" {
  name          = "${var.project_id}-audio-${var.environment}"
  location      = var.location
  force_destroy = var.environment == "dev" ? true : false

  # Public access for audio playback
  public_access_prevention = "inherited"

  uniform_bucket_level_access = true

  # CORS configuration for web playback
  cors {
    origin          = var.cors_origins
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type", "Content-Length", "Content-Range"]
    max_age_seconds = 3600
  }

  # Lifecycle rule: keep audio files indefinitely
  # (no deletion rule for now)

  labels = {
    purpose     = "audio-storage"
    environment = var.environment
  }
}

# Note: No public access - use signed URLs instead
# This prevents unauthorized bulk downloads and reduces cost risk

# Grant service account upload-only access (least privilege)
resource "google_storage_bucket_iam_member" "service_account_write" {
  bucket = google_storage_bucket.audio.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${var.service_account_email}"
}
