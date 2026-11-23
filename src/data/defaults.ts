import type {
  DealConfig,
  ElectricalStandards,
  MasterCatalogItem,
  SupplyIntelSku
} from '../types/schema';

export const DEFAULT_ELECTRICAL_STANDARDS: ElectricalStandards = {
  wiringCode: 'IS 732:2019',
  lowVoltageStandard: 'IEC 60364 / IS 732',
  harmonicsStandard: 'IEEE 519-2022 (<5% THD)',
  lightningProtection: 'IS/IEC 62305 Class II',
  earthingStandard: 'IS 3043:2018 (<1 Ohm Grid)',
  ceaRegulation: 'CEA Safety Regulations 2023',
  transformerStandard: 'IS 11171 / IEC 60076-11',
  busductIpRating: 'IP65',
  kFactorRating: 'K-13'
};

export const DEFAULT_SUPPLY_INTEL: SupplyIntelSku[] = [
  {
    "skuId": "IND-SWG-33KV-01",
    "name": "33 kV GIS Ring Main & MV Switchgear Lineup (2500A, 40kA)",
    "category": "Power & Switchgear",
    "oemTier": "Tier-1 Global-MakeInIndia",
    "vendorArchetype": "India MV Switchgear Factory (Pune/Vadodara)",
    "miiPercent": 68,
    "unit": "Panel",
    "unitPriceInrLakhs": 28.5,
    "leadTimeWeeks": 14,
    "certifications": [
      "IEC 62271-200",
      "BIS IS 3427",
      "CPRI Type Tested"
    ]
  },
  {
    "skuId": "IND-TRF-K13-02",
    "name": "3.15 MVA K-13 Cast Resin Dry-Type AI Harmonic Transformer (33/0.415 kV)",
    "category": "Transformers",
    "oemTier": "Tier-1 India",
    "vendorArchetype": "Indian Power Transformer OEM (Nashik/Thane)",
    "miiPercent": 82,
    "unit": "Unit",
    "unitPriceInrLakhs": 64.0,
    "leadTimeWeeks": 16,
    "certifications": [
      "IS 11171",
      "IEC 60076-11",
      "BEE Star Rated"
    ]
  },
  {
    "skuId": "IND-BUS-IP65-03",
    "name": "5000A Aluminum Sandwich Busduct Trunking (IP65 Outdoor / IP55 White-Space)",
    "category": "Busducts & PDUs",
    "oemTier": "Tier-1 India",
    "vendorArchetype": "Domestic Busway & LV Distribution OEM",
    "miiPercent": 79,
    "unit": "10m Run",
    "unitPriceInrLakhs": 18.2,
    "leadTimeWeeks": 10,
    "certifications": [
      "IEC 61439-6",
      "IS 8623",
      "IP65 Certified"
    ]
  },
  {
    "skuId": "IND-UPS-MOD-04",
    "name": "1.2 MW Modular Li-Ion Online Double-Conversion UPS Frame (97.2% Eff.)",
    "category": "BESS & UPS",
    "oemTier": "Tier-1 Global-MakeInIndia",
    "vendorArchetype": "India Power Electronics Assembly (Bengaluru)",
    "miiPercent": 54,
    "unit": "Frame",
    "unitPriceInrLakhs": 148.0,
    "leadTimeWeeks": 14,
    "certifications": [
      "IEC 62040-3",
      "UL 9540A",
      "BIS CRS"
    ]
  },
  {
    "skuId": "IND-BESS-LFP-05",
    "name": "2.5 MW / 1.25 MWh Containerized LFP BESS (AI Grid Load-Drop Protection)",
    "category": "BESS & UPS",
    "oemTier": "Tier-1 India",
    "vendorArchetype": "Indian Grid BESS Integrator (Chennai/Pune)",
    "miiPercent": 56,
    "unit": "Skid",
    "unitPriceInrLakhs": 310.0,
    "leadTimeWeeks": 18,
    "certifications": [
      "IEC 62619",
      "NFPA 855",
      "CEA Grid Code"
    ]
  },
  {
    "skuId": "IND-DG-2500-06",
    "name": "2.5 MVA CPCB-IV+ Compliant Acoustic Data Center Continuous DG Set",
    "category": "DG Backup Power",
    "oemTier": "Tier-1 India",
    "vendorArchetype": "Indian Heavy Genset Manufacturer (Pune)",
    "miiPercent": 76,
    "unit": "Unit",
    "unitPriceInrLakhs": 245.0,
    "leadTimeWeeks": 16,
    "certifications": [
      "CPCB-IV+",
      "ISO 8528 DCC",
      "PESO Fuel Yard Ready"
    ]
  },
  {
    "skuId": "IND-CHL-ADB-07",
    "name": "2.2 MW Free-Cooling Adiabatic Air-Cooled Magnetic Bearing Chiller",
    "category": "Cooling & Chillers",
    "oemTier": "Tier-1 Global-MakeInIndia",
    "vendorArchetype": "India Thermal Plant (Pune/Sri City)",
    "miiPercent": 58,
    "unit": "Unit",
    "unitPriceInrLakhs": 235.0,
    "leadTimeWeeks": 20,
    "certifications": [
      "AHRI 550/590",
      "ASHRAE 90.1",
      "ISO 9001"
    ]
  },
  {
    "skuId": "IND-CDU-1350-08",
    "name": "1.35 MW In-Row / Internal Liquid-to-Liquid CDU Tower (Dual Redundant Pumps)",
    "category": "Internal CDU & PAC",
    "oemTier": "Tier-1 Global-MakeInIndia",
    "vendorArchetype": "Liquid Cooling Thermal Partner (India Assembly)",
    "miiPercent": 42,
    "unit": "Tower",
    "unitPriceInrLakhs": 92.0,
    "leadTimeWeeks": 18,
    "certifications": [
      "ASHRAE TC 9.9",
      "OCP ACS Ready",
      "CE/UL"
    ]
  },
  {
    "skuId": "IND-PAC-80KW-09",
    "name": "80 kW Chilled-Water Precision Air Conditioner (EC Fans, Mandatory Dehumidification)",
    "category": "Internal CDU & PAC",
    "oemTier": "Tier-1 India",
    "vendorArchetype": "Indian Precision Cooling OEM (Navi Mumbai/Noida)",
    "miiPercent": 74,
    "unit": "Unit",
    "unitPriceInrLakhs": 26.0,
    "leadTimeWeeks": 10,
    "certifications": [
      "ASHRAE 127",
      "Eurovent",
      "BIS Compliant"
    ]
  },
  {
    "skuId": "IND-POD-2MW-10",
    "name": "2 MW Prefabricated Steel AI DLC Modular Pod Shell (Seismic Zone IV Rated)",
    "category": "Modular Enclosures",
    "oemTier": "Tier-1 India",
    "vendorArchetype": "Indian Heavy Modular Fabrication Yard (Navi Mumbai/Gujarat)",
    "miiPercent": 91,
    "unit": "Pod",
    "unitPriceInrLakhs": 185.0,
    "leadTimeWeeks": 14,
    "certifications": [
      "IS 800",
      "IS 1893:2016",
      "2-Hr Fire Rated"
    ]
  },
  {
    "skuId": "IND-PDU-RPP-11",
    "name": "400 kVA Intelligent Remote Power Panel & Dual-Feed Rack PDU Set",
    "category": "Busducts & PDUs",
    "oemTier": "Tier-1 India",
    "vendorArchetype": "Domestic Intelligent Power Distribution OEM",
    "miiPercent": 72,
    "unit": "Set",
    "unitPriceInrLakhs": 19.5,
    "leadTimeWeeks": 8,
    "certifications": [
      "IEC 61439",
      "Modbus/SNMPv3",
      "BIS"
    ]
  },
  {
    "skuId": "IND-VES-FIRE-12",
    "name": "VESDA-E Very Early Smoke Detection & Novec-1230 Clean Agent Suppression Pack",
    "category": "Compliance & Safety",
    "oemTier": "Tier-1 Global-MakeInIndia",
    "vendorArchetype": "India Fire Safety Integrator (PESO Cylinders)",
    "miiPercent": 48,
    "unit": "Zone Pack",
    "unitPriceInrLakhs": 22.0,
    "leadTimeWeeks": 8,
    "certifications": [
      "NFPA 2001",
      "UL/FM",
      "NBC India Part 4"
    ]
  },
  {
    "skuId": "IND-SCR-AIR-13",
    "name": "ISA G1 Chemical Air Scrubber & Positive-Pressure Filtration Unit (Coastal H2S/SOx)",
    "category": "Compliance & Safety",
    "oemTier": "Tier-1 India",
    "vendorArchetype": "Indian Industrial Air Filtration OEM",
    "miiPercent": 80,
    "unit": "Unit",
    "unitPriceInrLakhs": 14.5,
    "leadTimeWeeks": 6,
    "certifications": [
      "ISA-71.04 G1",
      "ASHRAE TC 9.9 Corrosion"
    ]
  },
  {
    "skuId": "IND-SEC-ROD-14",
    "name": "IP67 Thermal/PTZ CCTV Perimeter Suite + Ultrasonic Rodent Repellent Grid",
    "category": "Compliance & Safety",
    "oemTier": "Tier-1 India",
    "vendorArchetype": "STQC-Certified Indian Security OEM",
    "miiPercent": 69,
    "unit": "Site Pack",
    "unitPriceInrLakhs": 16.0,
    "leadTimeWeeks": 6,
    "certifications": [
      "STQC Certified",
      "ONVIF Profile S/T",
      "IP67"
    ]
  },
  {
    "skuId": "IND-MMR-ODF-15",
    "name": "Carrier-Grade Meet-Me Room (MMR) High-Density ODF Bay & Dual Fiber Vault Kit",
    "category": "Telecom & MMR",
    "oemTier": "Tier-1 India",
    "vendorArchetype": "Indian Optical Fiber & Telecom Infrastructure OEM",
    "miiPercent": 84,
    "unit": "MMR Bay",
    "unitPriceInrLakhs": 12.8,
    "leadTimeWeeks": 6,
    "certifications": [
      "TIA-942-B",
      "TEC GR Compliant"
    ]
  },
  {
    "skuId": "IND-CON-GLY-16",
    "name": "PG25 Inhibited Coolant Charge, 25-Micron Filter Cartridges & Commissioning Spares",
    "category": "Consumables & Spares",
    "oemTier": "Tier-1 India",
    "vendorArchetype": "Domestic Specialty Coolant & MEP Consumables Supplier",
    "miiPercent": 86,
    "unit": "MW-Lot",
    "unitPriceInrLakhs": 9.5,
    "leadTimeWeeks": 4,
    "certifications": [
      "ASTM D1384",
      "OCP Coolant Spec"
    ]
  }
];

export const DEFAULT_MASTER_CATALOG: MasterCatalogItem[] = [
  {
    "id": "CAT-POD-2MW",
    "code": "POD-DLC-2000",
    "name": "2.0 MW High-Density DLC Modular Pod (20 Racks @ 100kW)",
    "category": "Modular Pod",
    "ratingKw": 2000,
    "footprintM2": 82,
    "weightTons": 38,
    "unitCostInrLakhs": 185,
    "miiPercent": 91,
    "active": true
  },
  {
    "id": "CAT-POD-1MW",
    "code": "POD-DLC-1000",
    "name": "1.0 MW Compact DLC Modular Pod (10 Racks @ 100kW)",
    "category": "Modular Pod",
    "ratingKw": 1000,
    "footprintM2": 46,
    "weightTons": 24,
    "unitCostInrLakhs": 118,
    "miiPercent": 91,
    "active": true
  },
  {
    "id": "CAT-POD-05MW",
    "code": "POD-AC-500",
    "name": "0.5 MW Air-Cooled Edge/Inference Modular Pod",
    "category": "Modular Pod",
    "ratingKw": 500,
    "footprintM2": 36,
    "weightTons": 18,
    "unitCostInrLakhs": 78,
    "miiPercent": 90,
    "active": true
  },
  {
    "id": "CAT-CDU-1350",
    "code": "CDU-INT-1350",
    "name": "1.35 MW Internal Liquid-to-Liquid CDU Tower",
    "category": "Cooling - Internal",
    "ratingKw": 1350,
    "footprintM2": 2.4,
    "weightTons": 1.6,
    "unitCostInrLakhs": 92,
    "miiPercent": 42,
    "active": true
  },
  {
    "id": "CAT-PAC-80",
    "code": "PAC-CW-80",
    "name": "80 kW Mandatory White-Space Chilled-Water PAC",
    "category": "Cooling - Internal",
    "ratingKw": 80,
    "footprintM2": 2.1,
    "weightTons": 0.9,
    "unitCostInrLakhs": 26,
    "miiPercent": 74,
    "active": true
  },
  {
    "id": "CAT-CHL-2200",
    "code": "CHL-ADB-2200",
    "name": "2.2 MW Free-Cooling Adiabatic Chiller (Yard/Roof)",
    "category": "Cooling - Plant",
    "ratingKw": 2200,
    "footprintM2": 34,
    "weightTons": 16.5,
    "unitCostInrLakhs": 235,
    "miiPercent": 58,
    "active": true
  },
  {
    "id": "CAT-TRF-3150",
    "code": "TRF-K13-3150",
    "name": "3.15 MVA K-13 Dry-Type Cast Resin Transformer",
    "category": "Electrical",
    "ratingKw": 2835,
    "footprintM2": 14,
    "weightTons": 9.8,
    "unitCostInrLakhs": 64,
    "miiPercent": 82,
    "active": true
  },
  {
    "id": "CAT-BESS-2500",
    "code": "BESS-LFP-2500",
    "name": "2.5 MW / 1.25 MWh AI Grid Load-Drop BESS Skid",
    "category": "Electrical",
    "ratingKw": 2500,
    "footprintM2": 28,
    "weightTons": 24,
    "unitCostInrLakhs": 310,
    "miiPercent": 56,
    "active": true
  }
];

export const DEFAULT_NAVI_MUMBAI_DEAL: DealConfig = {
  "id": "deal-navi-mumbai-15mw",
  "schemaVersion": "12.4",
  "name": "15 MW Sovereign AI Cluster \u2014 Navi Mumbai",
  "customer": "National Sovereign AI Infrastructure Program",
  "updatedAt": "2026-11-22T05:00:00.000Z",
  "architecture": "Container",
  "uptimeTier": "Tier III",
  "redundancy": "N+1",
  "targetItLoadMw": 15,
  "dlcSharePct": 80,
  "avgRackKw": 100,
  "maxInletTempC": 32,
  "chilledWaterSupplyTempC": 16,
  "fwsSupplyTempC": 30,
  "chillerPlacement": "Yard",
  "containerUnitMw": 2.0,
  "includeBessRideThrough": true,
  "bessDurationMin": 30,
  "climate": {
    "city": "Navi Mumbai",
    "state": "Maharashtra",
    "latitude": 19.033,
    "longitude": 73.0297,
    "designDryBulbC": 39.2,
    "designWetBulbC": 28.6,
    "peakAmbientC": 42.4,
    "annualAvgTempC": 27.8,
    "ashraeClass": "A2",
    "seismicZone": "Zone III",
    "seismicZoneFactorZ": 0.16,
    "annualRainfallMm": 2450,
    "source": "Preset Baseline"
  },
  "civil": {
    "soilClass": "Soft Marine Clay",
    "soilSbcKpa": 125,
    "groundwaterDepthM": 2.2,
    "plinthClearHeightM": 0.9,
    "yardDrainageSlope": "1:50",
    "bnmSlabLiveLoadKpa": 25,
    "bnmClearHeightM": 6.5
  },
  "telecom": {
    "mmrCount": 2,
    "diverseVaultSeparationM": 28,
    "odfBaysPerMmr": 6,
    "carrierDemarcRacks": 8,
    "redundantPathways": true
  },
  "logistics": {
    "heaviestLiftTons": 38,
    "craneTonnage": 250,
    "boomRadiusM": 24,
    "hydraulicAxleTrailers": 4,
    "steelRoadMatsCount": 36,
    "spreaderBeamCapacityTons": 50,
    "siteTurningRadiusM": 18
  },
  "branding": {
    "clientName": "Sovereign AI Cloud",
    "primaryHex": "#FF5539",
    "accentHex": "#002870",
    "containerFinish": "Sovereign White",
    "artworkDeferred": true,
    "deferredCaveatNote": "Final external vinyl livery & illuminated signage deferred to FAT sign-off."
  },
  "commercial": {
    "currency": "INR",
    "fxInrPerUsd": 85.0,
    "powerTariffInrPerKwh": 8.2,
    "tariffEscalationPct": 4.0,
    "annualOmPctOfCapex": 2.2,
    "annualAmcPctOfCapex": 1.8,
    "waterTariffInrPerKl": 65.0,
    "contingencyPct": 5.0,
    "marginPct": 12.0,
    "gstPct": 18.0,
    "tcoYears": 5
  },
  "standards": {
    "wiringCode": "IS 732:2019",
    "lowVoltageStandard": "IEC 60364 / IS 732",
    "harmonicsStandard": "IEEE 519-2022 (<5% THD)",
    "lightningProtection": "IS/IEC 62305 Class II",
    "earthingStandard": "IS 3043:2018 (<1 Ohm Grid)",
    "ceaRegulation": "CEA Safety Regulations 2023",
    "transformerStandard": "IS 11171 / IEC 60076-11",
    "busductIpRating": "IP65",
    "kFactorRating": "K-13"
  },
  "specialQuotes": {}
};
