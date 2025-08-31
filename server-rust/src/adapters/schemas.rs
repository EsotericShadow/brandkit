use serde_json::json;

// Gemini REST expects JSON schema in the form: { type: "object", properties: { field: { type: "string" } } }
pub fn guide_schema() -> serde_json::Value {
    json!({
      "type": "object",
      "additionalProperties": false,
      "required": ["brandName","industry","mission","audience","tone","taglines","elevatorPitch"],
      "properties": {
        "brandName": {"type": "string"},
        "industry": {"type": "string"},
        "mission": {"type": "string"},
        "audience": {"type": "string"},
        "tone": {"type": "object", "additionalProperties": false, "required": ["traits","description","dosAndDonts"], "properties": {
          "traits": {"type": "array", "items": {"type": "string"}},
          "description": {"type": "string"},
          "dosAndDonts": {"type": "object", "additionalProperties": false, "required": ["dos","donts"], "properties": {
            "dos": {"type": "array", "items": {"type": "string"}},
            "donts": {"type": "array", "items": {"type": "string"}}
          }}
        }},
        "taglines": {"type": "array", "minItems": 3, "items": {
          "type": "object", "additionalProperties": false, "required": ["tagline","rationale"], "properties": {
            "tagline": {"type": "string"},
            "rationale": {"type": "string"}
          }
        }},
        "elevatorPitch": {"type": "string"}
      }
    })
}

#[allow(dead_code)]
pub fn palette_schema() -> serde_json::Value {
    json!({
      "type": "object",
      "properties": {
        "primary": {"type": "string"},
        "secondary": {"type": "string"},
        "accent": {"type": "string"},
        "neutralLight": {"type": "string"},
        "neutralDark": {"type": "string"}
      }
    })
}

pub fn palette_schema_for_roles(roles: &[String]) -> serde_json::Value {
    use serde_json::{json, Value};
    let mut props = serde_json::Map::new();
    for r in roles {
        props.insert(r.clone(), json!({"type": "string"}));
    }
    Value::Object(serde_json::Map::from_iter([
        ("type".to_string(), json!("object")),
        ("properties".to_string(), Value::Object(props)),
    ]))
}

pub fn consistency_schema() -> serde_json::Value {
    json!({
      "type": "object",
      "properties": {
        "score": {"type": "integer"},
        "feedback": {"type": "string"},
        "suggestions": {"type": "array", "items": {"type": "string"}}
      }
    })
}

// Orchestration schemas
pub fn split_schema() -> serde_json::Value {
    json!({
      "type": "object",
      "properties": {
        "shared": {"type": "object", "properties": {
          "brandName": {"type": "string"},
          "industry": {"type": "string"},
          "mission": {"type": "string"},
          "audience": {"type": "string"},
          "toneTraits": {"type": "array", "items": {"type": "string"}}
        }},
        "bgBrief": {"type": "string"},
        "meBrief": {"type": "string"},
        "ccBrief": {"type": "string"},
        "checklist": {"type": "string"}
      }
    })
}

pub fn bg_schema() -> serde_json::Value {
    json!({
      "type": "object",
      "properties": {
        "tone": {"type": "object", "properties": {
          "traits": {"type": "array", "items": {"type": "string"}},
          "description": {"type": "string"},
          "dosAndDonts": {"type": "object", "properties": {
            "dos": {"type": "array", "items": {"type": "string"}},
            "donts": {"type": "array", "items": {"type": "string"}}
          }}
        }}
      }
    })
}

pub fn me_schema() -> serde_json::Value {
    json!({
      "type": "object",
      "properties": {
        "audience": {"type": "string"},
        "pitchNotes": {"type": "string"}
      }
    })
}

pub fn cc_schema() -> serde_json::Value {
    json!({
      "type": "object",
      "properties": {
        "mission": {"type": "string"},
        "elevatorPitch": {"type": "string"},
        "taglines": {"type": "array", "items": {
          "type": "object", "properties": {
            "tagline": {"type": "string"},
            "rationale": {"type": "string"}
          }
        }}
      }
    })
}

// Schema for normalized user interjections (from natural language to structured JSON)
pub fn user_interjection_schema() -> serde_json::Value {
    json!({
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "constraints": {"type": "array", "items": {"type": "string"}},
        "preferences": {"type": "array", "items": {"type": "string"}},
        "corrections": {"type": "array", "items": {"type": "string"}},
        "answers": {"type": "array", "items": {"type": "string"}},
        "audienceHints": {"type": "array", "items": {"type": "string"}},
        "elevatorPitch": {"type": "string"},
        "palette": {"type": "object", "additionalProperties": {"type": "string"}},
        "priorities": {"type": "array", "items": {"type": "string"}}
      }
    })
}

