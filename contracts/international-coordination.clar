;; International Coordination Contract
;; Manages global wormhole research coordination and permissions

(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u500))
(define-constant ERR_COUNTRY_NOT_FOUND (err u501))
(define-constant ERR_AGREEMENT_NOT_FOUND (err u502))
(define-constant ERR_INVALID_PERMISSION (err u503))

;; Permission levels
(define-constant PERMISSION_OBSERVER u1)
(define-constant PERMISSION_PARTICIPANT u2)
(define-constant PERMISSION_COORDINATOR u3)
(define-constant PERMISSION_ADMINISTRATOR u4)

;; Agreement status
(define-constant AGREEMENT_PENDING u0)
(define-constant AGREEMENT_ACTIVE u1)
(define-constant AGREEMENT_SUSPENDED u2)
(define-constant AGREEMENT_TERMINATED u3)

;; Country registrations
(define-map countries
  { country-code: (string-ascii 3) }
  {
    name: (string-ascii 100),
    representative: principal,
    permission-level: uint,
    registration-date: uint,
    last-activity: uint,
    active-facilities: uint
  }
)

;; International agreements
(define-map agreements
  { agreement-id: uint }
  {
    title: (string-ascii 200),
    description: (string-ascii 500),
    participating-countries: (list 20 (string-ascii 3)),
    status: uint,
    creation-date: uint,
    effective-date: uint,
    expiry-date: uint
  }
)

;; Data sharing permissions
(define-map data-sharing-permissions
  { from-country: (string-ascii 3), to-country: (string-ascii 3) }
  {
    permission-level: uint,
    granted-date: uint,
    expiry-date: uint,
    conditions: (string-ascii 200)
  }
)

(define-data-var agreement-counter uint u0)

;; Register country
(define-public (register-country
  (country-code (string-ascii 3))
  (name (string-ascii 100))
  (representative principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (map-set countries
      { country-code: country-code }
      {
        name: name,
        representative: representative,
        permission-level: PERMISSION_OBSERVER,
        registration-date: block-height,
        last-activity: block-height,
        active-facilities: u0
      }
    )
    (ok true)
  )
)

;; Update country permission level
(define-public (update-country-permission
  (country-code (string-ascii 3))
  (new-permission-level uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (is-some (map-get? countries { country-code: country-code })) ERR_COUNTRY_NOT_FOUND)
    (asserts! (<= new-permission-level PERMISSION_ADMINISTRATOR) ERR_INVALID_PERMISSION)
    (map-set countries
      { country-code: country-code }
      (merge (unwrap-panic (map-get? countries { country-code: country-code }))
        { permission-level: new-permission-level }
      )
    )
    (ok true)
  )
)

;; Create international agreement
(define-public (create-agreement
  (title (string-ascii 200))
  (description (string-ascii 500))
  (participating-countries (list 20 (string-ascii 3)))
  (effective-date uint)
  (expiry-date uint))
  (let ((agreement-id (+ (var-get agreement-counter) u1)))
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (map-set agreements
      { agreement-id: agreement-id }
      {
        title: title,
        description: description,
        participating-countries: participating-countries,
        status: AGREEMENT_PENDING,
        creation-date: block-height,
        effective-date: effective-date,
        expiry-date: expiry-date
      }
    )
    (var-set agreement-counter agreement-id)
    (ok agreement-id)
  )
)

;; Activate agreement
(define-public (activate-agreement (agreement-id uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (is-some (map-get? agreements { agreement-id: agreement-id })) ERR_AGREEMENT_NOT_FOUND)
    (map-set agreements
      { agreement-id: agreement-id }
      (merge (unwrap-panic (map-get? agreements { agreement-id: agreement-id }))
        { status: AGREEMENT_ACTIVE }
      )
    )
    (ok true)
  )
)

;; Grant data sharing permission
(define-public (grant-data-sharing-permission
  (from-country (string-ascii 3))
  (to-country (string-ascii 3))
  (permission-level uint)
  (expiry-date uint)
  (conditions (string-ascii 200)))
  (begin
    (asserts! (or
      (is-eq tx-sender CONTRACT_OWNER)
      (is-eq tx-sender (get representative (unwrap-panic (map-get? countries { country-code: from-country }))))
    ) ERR_UNAUTHORIZED)
    (map-set data-sharing-permissions
      { from-country: from-country, to-country: to-country }
      {
        permission-level: permission-level,
        granted-date: block-height,
        expiry-date: expiry-date,
        conditions: conditions
      }
    )
    (ok true)
  )
)

;; Get country details
(define-read-only (get-country (country-code (string-ascii 3)))
  (map-get? countries { country-code: country-code })
)

;; Get agreement details
(define-read-only (get-agreement (agreement-id uint))
  (map-get? agreements { agreement-id: agreement-id })
)

;; Get data sharing permission
(define-read-only (get-data-sharing-permission
  (from-country (string-ascii 3))
  (to-country (string-ascii 3)))
  (map-get? data-sharing-permissions { from-country: from-country, to-country: to-country })
)

;; Check if country has permission for action
(define-read-only (has-permission (country-code (string-ascii 3)) (required-level uint))
  (match (map-get? countries { country-code: country-code })
    country (>= (get permission-level country) required-level)
    false
  )
)

;; Get agreement count
(define-read-only (get-agreement-count)
  (var-get agreement-counter)
)
