import { describe, it, expect, beforeEach } from "vitest"

describe("Facility Verification Contract", () => {
  const contractState = {
    facilities: new Map(),
    facilityCounter: 0,
    authorizedVerifiers: new Map(),
    contractOwner: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  }
  
  beforeEach(() => {
    // Reset contract state
    contractState.facilities.clear()
    contractState.facilityCounter = 0
    contractState.authorizedVerifiers.clear()
    contractState.authorizedVerifiers.set(contractState.contractOwner, true)
  })
  
  // Mock contract functions
  const registerFacility = (name, location, sender) => {
    const facilityId = contractState.facilityCounter + 1
    contractState.facilities.set(facilityId, {
      name,
      location,
      contactPrincipal: sender,
      status: 0, // STATUS_PENDING
      verificationDate: 0,
      safetyRating: 0,
    })
    contractState.facilityCounter = facilityId
    return { ok: facilityId }
  }
  
  const verifyFacility = (facilityId, safetyRating, sender) => {
    if (!contractState.authorizedVerifiers.get(sender)) {
      return { err: 100 } // ERR_UNAUTHORIZED
    }
    if (!contractState.facilities.has(facilityId)) {
      return { err: 102 } // ERR_FACILITY_NOT_FOUND
    }
    
    const facility = contractState.facilities.get(facilityId)
    contractState.facilities.set(facilityId, {
      ...facility,
      status: 1, // STATUS_VERIFIED
      verificationDate: 1000, // mock block height
      safetyRating,
    })
    return { ok: true }
  }
  
  const getFacility = (facilityId) => {
    return contractState.facilities.get(facilityId) || null
  }
  
  const isFacilityVerified = (facilityId) => {
    const facility = contractState.facilities.get(facilityId)
    return facility ? facility.status === 1 : false
  }
  
  describe("Facility Registration", () => {
    it("should register a new facility successfully", () => {
      const result = registerFacility(
          "CERN Wormhole Lab",
          "Geneva, Switzerland",
          "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      )
      
      expect(result.ok).toBe(1)
      expect(contractState.facilityCounter).toBe(1)
      
      const facility = getFacility(1)
      expect(facility.name).toBe("CERN Wormhole Lab")
      expect(facility.location).toBe("Geneva, Switzerland")
      expect(facility.status).toBe(0) // STATUS_PENDING
    })
    
    it("should increment facility counter for multiple registrations", () => {
      registerFacility("Lab 1", "Location 1", "sender1")
      registerFacility("Lab 2", "Location 2", "sender2")
      
      expect(contractState.facilityCounter).toBe(2)
      expect(getFacility(1).name).toBe("Lab 1")
      expect(getFacility(2).name).toBe("Lab 2")
    })
  })
  
  describe("Facility Verification", () => {
    beforeEach(() => {
      registerFacility("Test Lab", "Test Location", "sender1")
    })
    
    it("should verify facility when called by authorized verifier", () => {
      const result = verifyFacility(1, 85, contractState.contractOwner)
      
      expect(result.ok).toBe(true)
      
      const facility = getFacility(1)
      expect(facility.status).toBe(1) // STATUS_VERIFIED
      expect(facility.safetyRating).toBe(85)
      expect(facility.verificationDate).toBe(1000)
    })
    
    it("should reject verification from unauthorized user", () => {
      const result = verifyFacility(1, 85, "unauthorized-user")
      
      expect(result.err).toBe(100) // ERR_UNAUTHORIZED
      
      const facility = getFacility(1)
      expect(facility.status).toBe(0) // Still pending
    })
    
    it("should reject verification of non-existent facility", () => {
      const result = verifyFacility(999, 85, contractState.contractOwner)
      
      expect(result.err).toBe(102) // ERR_FACILITY_NOT_FOUND
    })
  })
  
  describe("Facility Status Checks", () => {
    beforeEach(() => {
      registerFacility("Test Lab", "Test Location", "sender1")
    })
    
    it("should return false for unverified facility", () => {
      expect(isFacilityVerified(1)).toBe(false)
    })
    
    it("should return true for verified facility", () => {
      verifyFacility(1, 85, contractState.contractOwner)
      expect(isFacilityVerified(1)).toBe(true)
    })
    
    it("should return false for non-existent facility", () => {
      expect(isFacilityVerified(999)).toBe(false)
    })
  })
  
  describe("Data Retrieval", () => {
    it("should return facility details correctly", () => {
      registerFacility("Advanced Lab", "Tokyo, Japan", "sender1")
      verifyFacility(1, 92, contractState.contractOwner)
      
      const facility = getFacility(1)
      expect(facility.name).toBe("Advanced Lab")
      expect(facility.location).toBe("Tokyo, Japan")
      expect(facility.status).toBe(1)
      expect(facility.safetyRating).toBe(92)
    })
    
    it("should return null for non-existent facility", () => {
      expect(getFacility(999)).toBe(null)
    })
    
    it("should track facility counter correctly", () => {
      expect(contractState.facilityCounter).toBe(0)
      
      registerFacility("Lab 1", "Location 1", "sender1")
      expect(contractState.facilityCounter).toBe(1)
      
      registerFacility("Lab 2", "Location 2", "sender2")
      expect(contractState.facilityCounter).toBe(2)
    })
  })
})
