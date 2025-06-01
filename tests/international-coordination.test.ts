import { describe, it, expect, beforeEach } from "vitest"

describe("International Coordination Contract", () => {
  const contractState = {
    countries: new Map(),
    agreements: new Map(),
    dataSharingPermissions: new Map(),
    agreementCounter: 0,
    contractOwner: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  }
  
  beforeEach(() => {
    contractState.countries.clear()
    contractState.agreements.clear()
    contractState.dataSharingPermissions.clear()
    contractState.agreementCounter = 0
  })
  
  const registerCountry = (countryCode, name, representative, sender) => {
    if (sender !== contractState.contractOwner) {
      return { err: 500 } // ERR_UNAUTHORIZED
    }
    
    contractState.countries.set(countryCode, {
      name,
      representative,
      permissionLevel: 1, // PERMISSION_OBSERVER
      registrationDate: 1000,
      lastActivity: 1000,
      activeFacilities: 0,
    })
    return { ok: true }
  }
  
  const updateCountryPermission = (countryCode, newPermissionLevel, sender) => {
    if (sender !== contractState.contractOwner) {
      return { err: 500 } // ERR_UNAUTHORIZED
    }
    if (!contractState.countries.has(countryCode)) {
      return { err: 501 } // ERR_COUNTRY_NOT_FOUND
    }
    if (newPermissionLevel > 4) {
      // PERMISSION_ADMINISTRATOR = 4
      return { err: 503 } // ERR_INVALID_PERMISSION
    }
    
    const country = contractState.countries.get(countryCode)
    contractState.countries.set(countryCode, {
      ...country,
      permissionLevel: newPermissionLevel,
    })
    return { ok: true }
  }
  
  const createAgreement = (title, description, participatingCountries, effectiveDate, expiryDate, sender) => {
    if (sender !== contractState.contractOwner) {
      return { err: 500 } // ERR_UNAUTHORIZED
    }
    
    const agreementId = contractState.agreementCounter + 1
    contractState.agreements.set(agreementId, {
      title,
      description,
      participatingCountries,
      status: 0, // AGREEMENT_PENDING
      creationDate: 1000,
      effectiveDate,
      expiryDate,
    })
    contractState.agreementCounter = agreementId
    return { ok: agreementId }
  }
  
  const activateAgreement = (agreementId, sender) => {
    if (sender !== contractState.contractOwner) {
      return { err: 500 } // ERR_UNAUTHORIZED
    }
    if (!contractState.agreements.has(agreementId)) {
      return { err: 502 } // ERR_AGREEMENT_NOT_FOUND
    }
    
    const agreement = contractState.agreements.get(agreementId)
    contractState.agreements.set(agreementId, {
      ...agreement,
      status: 1, // AGREEMENT_ACTIVE
    })
    return { ok: true }
  }
  
  const grantDataSharingPermission = (fromCountry, toCountry, permissionLevel, expiryDate, conditions, sender) => {
    const country = contractState.countries.get(fromCountry)
    if (!country) {
      return { err: 501 } // ERR_COUNTRY_NOT_FOUND
    }
    
    const isAuthorized = sender === contractState.contractOwner || sender === country.representative
    
    if (!isAuthorized) {
      return { err: 500 } // ERR_UNAUTHORIZED
    }
    
    const key = `${fromCountry}-${toCountry}`
    contractState.dataSharingPermissions.set(key, {
      permissionLevel,
      grantedDate: 1000,
      expiryDate,
      conditions,
    })
    return { ok: true }
  }
  
  const getCountry = (countryCode) => {
    return contractState.countries.get(countryCode) || null
  }
  
  const getAgreement = (agreementId) => {
    return contractState.agreements.get(agreementId) || null
  }
  
  const getDataSharingPermission = (fromCountry, toCountry) => {
    const key = `${fromCountry}-${toCountry}`
    return contractState.dataSharingPermissions.get(key) || null
  }
  
  const hasPermission = (countryCode, requiredLevel) => {
    const country = contractState.countries.get(countryCode)
    return country ? country.permissionLevel >= requiredLevel : false
  }
  
  describe("Country Registration", () => {
    it("should register country when called by contract owner", () => {
      const result = registerCountry(
          "USA",
          "United States of America",
          "us-representative",
          contractState.contractOwner,
      )
      
      expect(result.ok).toBe(true)
      
      const country = getCountry("USA")
      expect(country.name).toBe("United States of America")
      expect(country.representative).toBe("us-representative")
      expect(country.permissionLevel).toBe(1) // PERMISSION_OBSERVER
    })
    
    it("should reject registration from unauthorized user", () => {
      const result = registerCountry("USA", "United States of America", "us-representative", "unauthorized-user")
      
      expect(result.err).toBe(500) // ERR_UNAUTHORIZED
      expect(getCountry("USA")).toBe(null)
    })
    
    it("should register multiple countries", () => {
      registerCountry("USA", "United States", "us-rep", contractState.contractOwner)
      registerCountry("CHN", "China", "cn-rep", contractState.contractOwner)
      registerCountry("RUS", "Russia", "ru-rep", contractState.contractOwner)
      
      expect(getCountry("USA").name).toBe("United States")
      expect(getCountry("CHN").name).toBe("China")
      expect(getCountry("RUS").name).toBe("Russia")
    })
  })
  
  describe("Permission Management", () => {
    beforeEach(() => {
      registerCountry("USA", "United States", "us-rep", contractState.contractOwner)
    })
    
    it("should update country permission when called by owner", () => {
      const result = updateCountryPermission("USA", 3, contractState.contractOwner) // PERMISSION_COORDINATOR
      
      expect(result.ok).toBe(true)
      
      const country = getCountry("USA")
      expect(country.permissionLevel).toBe(3)
    })
    
    it("should reject permission update from unauthorized user", () => {
      const result = updateCountryPermission("USA", 3, "unauthorized-user")
      
      expect(result.err).toBe(500) // ERR_UNAUTHORIZED
      
      const country = getCountry("USA")
      expect(country.permissionLevel).toBe(1) // Still observer
    })
    
    it("should reject update for non-existent country", () => {
      const result = updateCountryPermission("XXX", 3, contractState.contractOwner)
      
      expect(result.err).toBe(501) // ERR_COUNTRY_NOT_FOUND
    })
    
    it("should reject invalid permission level", () => {
      const result = updateCountryPermission("USA", 5, contractState.contractOwner) // Invalid level
      
      expect(result.err).toBe(503) // ERR_INVALID_PERMISSION
      
      const country = getCountry("USA")
      expect(country.permissionLevel).toBe(1) // Unchanged
    })
  })
  
  describe("Agreement Management", () => {
    it("should create agreement when called by owner", () => {
      const result = createAgreement(
          "Global Wormhole Research Treaty",
          "International cooperation framework for wormhole research",
          ["USA", "CHN", "RUS", "EUR"],
          2000,
          5000,
          contractState.contractOwner,
      )
      
      expect(result.ok).toBe(1)
      expect(contractState.agreementCounter).toBe(1)
      
      const agreement = getAgreement(1)
      expect(agreement.title).toBe("Global Wormhole Research Treaty")
      expect(agreement.participatingCountries).toEqual(["USA", "CHN", "RUS", "EUR"])
      expect(agreement.status).toBe(0) // AGREEMENT_PENDING
    })
    
    it("should reject agreement creation from unauthorized user", () => {
      const result = createAgreement(
          "Test Agreement",
          "Test Description",
          ["USA", "CHN"],
          2000,
          5000,
          "unauthorized-user",
      )
      
      expect(result.err).toBe(500) // ERR_UNAUTHORIZED
      expect(contractState.agreementCounter).toBe(0)
    })
    
    it("should activate agreement when called by owner", () => {
      createAgreement("Test Agreement", "Description", ["USA"], 2000, 5000, contractState.contractOwner)
      
      const result = activateAgreement(1, contractState.contractOwner)
      
      expect(result.ok).toBe(true)
      
      const agreement = getAgreement(1)
      expect(agreement.status).toBe(1) // AGREEMENT_ACTIVE
    })
    
    it("should reject activation from unauthorized user", () => {
      createAgreement("Test Agreement", "Description", ["USA"], 2000, 5000, contractState.contractOwner)
      
      const result = activateAgreement(1, "unauthorized-user")
      
      expect(result.err).toBe(500) // ERR_UNAUTHORIZED
      
      const agreement = getAgreement(1)
      expect(agreement.status).toBe(0) // Still pending
    })
    
    it("should reject activation of non-existent agreement", () => {
      const result = activateAgreement(999, contractState.contractOwner)
      
      expect(result.err).toBe(502) // ERR_AGREEMENT_NOT_FOUND
    })
  })
  
  describe("Data Sharing Permissions", () => {
    beforeEach(() => {
      registerCountry("USA", "United States", "us-rep", contractState.contractOwner)
      registerCountry("CHN", "China", "cn-rep", contractState.contractOwner)
    })
    
    it("should grant permission when called by contract owner", () => {
      const result = grantDataSharingPermission(
          "USA",
          "CHN",
          2, // PERMISSION_PARTICIPANT
          3000,
          "Standard research data sharing",
          contractState.contractOwner,
      )
      
      expect(result.ok).toBe(true)
      
      const permission = getDataSharingPermission("USA", "CHN")
      expect(permission.permissionLevel).toBe(2)
      expect(permission.conditions).toBe("Standard research data sharing")
    })
    
    it("should grant permission when called by country representative", () => {
      const result = grantDataSharingPermission(
          "USA",
          "CHN",
          2,
          3000,
          "Bilateral research agreement",
          "us-rep", // Country representative
      )
      
      expect(result.ok).toBe(true)
      
      const permission = getDataSharingPermission("USA", "CHN")
      expect(permission.permissionLevel).toBe(2)
    })
    
    it("should reject permission grant from unauthorized user", () => {
      const result = grantDataSharingPermission("USA", "CHN", 2, 3000, "Unauthorized attempt", "unauthorized-user")
      
      expect(result.err).toBe(500) // ERR_UNAUTHORIZED
      expect(getDataSharingPermission("USA", "CHN")).toBe(null)
    })
    
    it("should reject permission for non-existent country", () => {
      const result = grantDataSharingPermission("XXX", "CHN", 2, 3000, "Invalid country", contractState.contractOwner)
      
      expect(result.err).toBe(501) // ERR_COUNTRY_NOT_FOUND
    })
  })
  
  describe("Permission Checks", () => {
    beforeEach(() => {
      registerCountry("USA", "United States", "us-rep", contractState.contractOwner)
      updateCountryPermission("USA", 3, contractState.contractOwner) // PERMISSION_COORDINATOR
    })
    
    it("should return true when country has sufficient permission", () => {
      expect(hasPermission("USA", 1)).toBe(true) // Observer level
      expect(hasPermission("USA", 2)).toBe(true) // Participant level
      expect(hasPermission("USA", 3)).toBe(true) // Coordinator level
    })
    
    it("should return false when country lacks sufficient permission", () => {
      expect(hasPermission("USA", 4)).toBe(false) // Administrator level
    })
    
    it("should return false for non-existent country", () => {
      expect(hasPermission("XXX", 1)).toBe(false)
    })
  })
  
  describe("Data Retrieval", () => {
    it("should return null for non-existent entities", () => {
      expect(getCountry("XXX")).toBe(null)
      expect(getAgreement(999)).toBe(null)
      expect(getDataSharingPermission("XXX", "YYY")).toBe(null)
    })
    
    it("should track agreement counter correctly", () => {
      expect(contractState.agreementCounter).toBe(0)
      
      createAgreement("Agreement 1", "Description 1", ["USA"], 2000, 5000, contractState.contractOwner)
      expect(contractState.agreementCounter).toBe(1)
      
      createAgreement("Agreement 2", "Description 2", ["CHN"], 2000, 5000, contractState.contractOwner)
      expect(contractState.agreementCounter).toBe(2)
    })
  })
  
  describe("Complex Scenarios", () => {
    it("should handle multiple countries and agreements", () => {
      // Register multiple countries
      const countries = [
        { code: "USA", name: "United States", rep: "us-rep" },
        { code: "CHN", name: "China", rep: "cn-rep" },
        { code: "RUS", name: "Russia", rep: "ru-rep" },
        { code: "EUR", name: "European Union", rep: "eu-rep" },
      ]
      
      countries.forEach((country) => {
        registerCountry(country.code, country.name, country.rep, contractState.contractOwner)
        updateCountryPermission(country.code, 2, contractState.contractOwner) // PERMISSION_PARTICIPANT
      })
      
      // Create bilateral agreements
      createAgreement(
          "US-China Agreement",
          "Bilateral cooperation",
          ["USA", "CHN"],
          2000,
          5000,
          contractState.contractOwner,
      )
      createAgreement(
          "Global Treaty",
          "Multilateral framework",
          ["USA", "CHN", "RUS", "EUR"],
          2000,
          5000,
          contractState.contractOwner,
      )
      
      // Grant data sharing permissions
      grantDataSharingPermission("USA", "CHN", 2, 3000, "Research data", contractState.contractOwner)
      grantDataSharingPermission("CHN", "USA", 2, 3000, "Research data", contractState.contractOwner)
      
      // Verify all entities exist and have correct properties
      expect(getCountry("USA").permissionLevel).toBe(2)
      expect(getAgreement(1).participatingCountries).toEqual(["USA", "CHN"])
      expect(getAgreement(2).participatingCountries).toEqual(["USA", "CHN", "RUS", "EUR"])
      expect(getDataSharingPermission("USA", "CHN").permissionLevel).toBe(2)
      expect(getDataSharingPermission("CHN", "USA").permissionLevel).toBe(2)
    })
  })
})
