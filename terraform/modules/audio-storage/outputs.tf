output "bucket_name" {
  description = "The name of the audio storage bucket"
  value       = google_storage_bucket.audio.name
}

output "bucket_url" {
  description = "The URL of the audio storage bucket"
  value       = google_storage_bucket.audio.url
}

output "public_url_prefix" {
  description = "Public URL prefix for accessing audio files"
  value       = "https://storage.googleapis.com/${google_storage_bucket.audio.name}"
}
