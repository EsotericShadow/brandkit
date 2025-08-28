use serde_json::json;

// Gemini REST expects JSON schema in the form: { type: "object", properties: { field: { type: "string" } } }
pub fn guide_schema() -> serde_json::Value {
    json!({
      "type": "object",
      "properties": {
        "brandName": {"type": "string"},
        "industry": {"type": "string"},
        "mission": {"type": "string"},
        "audience": {"type": "string"},
        "tone": {"type": "object", "properties": {
          "traits": {"type": "array", "items": {"type": "string"}},
          "description": {"type": "string"},
          "dosAndDonts": {"type": "object", "properties": {
            "dos": {"type": "array", "items": {"type": "string"}},
            "donts": {"type": "array", "items": {"type": "string"}}
          }}
        }},
        "taglines": {"type": "array", "items": {
          "type": "object", "properties": {
            "tagline": {"type": "string"},
            "rationale": {"type": "string"}
          }
        }},
        "elevatorPitch": {"type": "string"}
      }
    })
}

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

