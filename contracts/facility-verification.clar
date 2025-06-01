;; Facility Verification Contract
;; Validates and manages wormhole research institutions

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_FACILITY_EXISTS (err u101))
(define-constant ERR_FACILITY_NOT_FOUND (err u102))
(define-constant ERR_INVALID_STATUS (err u103))

;; Facility status types
(define-constant STATUS_PENDING u0)
(define-constant STATUS_VERIFIED u1)
(define-constant STATUS_SUSPENDED u2)
(define-constant STATUS_REVOKED u3)

;; Data structure for research facilities
(define-map facilities
  { facility-id: uint }
  {
    name: (string-ascii 100),
    location: (string-ascii 100),
    contact-principal: principal,
    status: uint,
    verification-date: uint,
    safety-rating: uint
  }
)

;; Track facility count
(define-data-var facility-counter uint u0)

;; Authorized verifiers
(define-map authorized-verifiers principal bool)

;; Initialize contract owner as authorized verifier
(map-set authorized-verifiers CONTRACT_OWNER true)

;; Register a new research facility
(define-public (register-facility (name (string-ascii 100)) (location (string-ascii 100)))
  (let ((facility-id (+ (var-get facility-counter) u1)))
    (map-set facilities
      { facility-id: facility-id }
      {
        name: name,
        location: location,
        contact-principal: tx-sender,
        status: STATUS_PENDING,
        verification-date: u0,
        safety-rating: u0
      }
    )
    (var-set facility-counter facility-id)
    (ok facility-id)
  )
)

;; Verify a facility (only authorized verifiers)
(define-public (verify-facility (facility-id uint) (safety-rating uint))
  (begin
    (asserts! (default-to false (map-get? authorized-verifiers tx-sender)) ERR_UNAUTHORIZED)
    (asserts! (is-some (map-get? facilities { facility-id: facility-id })) ERR_FACILITY_NOT_FOUND)
    (map-set facilities
      { facility-id: facility-id }
      (merge (unwrap-panic (map-get? facilities { facility-id: facility-id }))
        {
          status: STATUS_VERIFIED,
          verification-date: block-height,
          safety-rating: safety-rating
        }
      )
    )
    (ok true)
  )
)

;; Update facility status
(define-public (update-facility-status (facility-id uint) (new-status uint))
  (begin
    (asserts! (default-to false (map-get? authorized-verifiers tx-sender)) ERR_UNAUTHORIZED)
    (asserts! (is-some (map-get? facilities { facility-id: facility-id })) ERR_FACILITY_NOT_FOUND)
    (asserts! (<= new-status STATUS_REVOKED) ERR_INVALID_STATUS)
    (map-set facilities
      { facility-id: facility-id }
      (merge (unwrap-panic (map-get? facilities { facility-id: facility-id }))
        { status: new-status }
      )
    )
    (ok true)
  )
)

;; Add authorized verifier
(define-public (add-verifier (verifier principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (map-set authorized-verifiers verifier true)
    (ok true)
  )
)

;; Get facility details
(define-read-only (get-facility (facility-id uint))
  (map-get? facilities { facility-id: facility-id })
)

;; Get facility count
(define-read-only (get-facility-count)
  (var-get facility-counter)
)

;; Check if facility is verified
(define-read-only (is-facility-verified (facility-id uint))
  (match (map-get? facilities { facility-id: facility-id })
    facility (is-eq (get status facility) STATUS_VERIFIED)
    false
  )
)
