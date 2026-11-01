//! Pack-aware starting cards shared by the native and web bridges.
use super::state::Session;
use crate::modes::GameMode;
use phomu_catalog::{Song, normalize_pack_ids};
use phomu_errors::{ErrorCode, PhomuError, Result};

impl Session {
    /// Initializes an empty Timeline from the selected packs, before drawing.
    /// Existing cards survive later rounds. A very small catalogue is filled
    /// with adjacent years rather than unrelated centuries.
    /// # Errors
    /// Returns CatalogueEmpty when none of the selected packs has songs.
    pub fn prepare_timeline(&mut self, catalogue: &[Song]) -> Result<()> {
        if self.state.round.mode != GameMode::Timeline || !self.state.timeline_years.is_empty() {
            return Ok(());
        }
        let packs = normalize_pack_ids(&self.state.config.selected_packs);
        let mut years: Vec<i32> = catalogue
            .iter()
            .filter(|song| packs.is_empty() || song.packs.iter().any(|pack| packs.contains(pack)))
            .map(|song| song.year)
            .collect();
        years.sort_unstable();
        years.dedup();
        if years.is_empty() {
            return Err(PhomuError::new(ErrorCode::CatalogueEmpty));
        }
        while years.len() < phomu_config::TIMELINE_INITIAL_YEARS {
            let last = years.last().copied().unwrap_or_default();
            years.push(last.saturating_add(1));
        }
        let mut chosen = Vec::new();
        while chosen.len() < phomu_config::TIMELINE_INITIAL_YEARS {
            let index = self.rng.index(years.len());
            chosen.push(years.remove(index));
        }
        self.init_timeline(chosen)
    }
}
