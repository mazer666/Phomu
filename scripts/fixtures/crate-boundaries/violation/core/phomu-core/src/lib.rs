//! A stand-in for the rules crate. It reaches up into the bridge, which is
//! exactly what the rule table forbids.
pub fn rules() -> &'static str {
    "rules"
}
