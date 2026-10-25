//! The seeded random generator of the base.
//!
//! WHAT: a small, reproducible generator ([`Rng`]) and the mixing function
//! it is built on ([`mix`]).
//!
//! WHY: the mode rotation, the song draw and the redistribution of the
//! players have to be reproducible: a seed and a sequence of inputs produce
//! the same game, and a bug report can be replayed
//! (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-113). The base therefore owns
//! the generator instead of calling a system source of randomness — the core
//! reads no environment and no clock.

/// A reproducible random generator.
///
/// WHY: the mode rotation, the song draw and the redistribution of the
/// players have to be reproducible: a seed and a sequence of inputs produce
/// the same game, and a bug report can be replayed
/// (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-113).
///
/// The generator is the SplitMix64 algorithm: a small, fast generator with
/// a period of 2^64, which is more than enough for a party game and has no
/// hidden state.
///
/// EXAMPLE: two generators with the same seed produce the same sequence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Rng {
    state: u64,
}

impl Rng {
    /// Builds a generator with a seed.
    ///
    /// WHY: the seed is a parameter of the session and not a value the core
    /// reads from the environment — the core reads no environment and no
    /// clock.
    ///
    /// EXAMPLE: `Rng::new(42)` is reproducible.
    pub const fn new(seed: u64) -> Self {
        Self { state: seed }
    }

    /// The current state of the generator.
    ///
    /// WHY: the state is part of the persisted state, so that a session
    /// that is reloaded continues with the same sequence.
    pub const fn state(&self) -> u64 {
        self.state
    }

    /// Sets the state of the generator.
    pub const fn set_state(&mut self, state: u64) {
        self.state = state;
    }

    /// The next value of the sequence.
    ///
    /// WHY: the sequence is the only source of randomness of the base; a
    /// shell that wants its own randomness has to seed its own generator.
    ///
    /// EXAMPLE: `Rng::new(0).next_u64()` is a fixed number.
    pub fn next_u64(&mut self) -> u64 {
        self.state = self.state.wrapping_add(0x9e37_79b9_7f4a_7c15);
        mix(self.state)
    }

    /// The next value of the sequence, reduced to a range.
    ///
    /// WHY: a bound of zero yields zero — the function never divides by
    /// zero, because a division by zero would be a panic and a recoverable
    /// condition is an error value, never a panic
    /// (docs/spec/REQUIREMENTS-PLATFORM.md, CORE-111).
    ///
    /// EXAMPLE: `Rng::new(1).below(10)` is smaller than ten.
    pub fn below(&mut self, bound: u64) -> u64 {
        if bound == 0 {
            return 0;
        }
        self.next_u64() % bound
    }

    /// The next index of a list.
    ///
    /// WHY: an empty list has no index; the function yields zero instead of
    /// panicking, because the caller checks the length itself.
    ///
    /// EXAMPLE: `Rng::new(1).index(3)` is smaller than three.
    pub fn index(&mut self, length: usize) -> usize {
        if length == 0 {
            return 0;
        }
        (self.below(length as u64)) as usize
    }
}

/// The mixing function of SplitMix64.
///
/// WHY: the mixing function turns a counter into a well-distributed value;
/// it is used by the generator and by the deterministic shuffling of the
/// mode options.
///
/// EXAMPLE: `mix(0)` is a fixed number.
pub const fn mix(value: u64) -> u64 {
    let mut z = value.wrapping_add(0x9e37_79b9_7f4a_7c15);
    z = (z ^ (z >> 30)).wrapping_mul(0xbf58_476d_1ce4_e5b9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94d0_49bb_1331_11eb);
    z ^ (z >> 31)
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::{Rng, mix};

    #[test]
    fn the_same_seed_produces_the_same_sequence() {
        let mut first = Rng::new(42);
        let mut second = Rng::new(42);
        for _ in 0..8 {
            assert_eq!(first.next_u64(), second.next_u64());
        }
    }

    #[test]
    fn different_seeds_produce_different_sequences() {
        let mut first = Rng::new(1);
        let mut second = Rng::new(2);
        assert_ne!(first.next_u64(), second.next_u64());
    }

    #[test]
    fn the_state_can_be_restored() {
        let mut generator = Rng::new(7);
        let first = generator.next_u64();
        let state = generator.state();
        let mut restored = Rng::new(0);
        restored.set_state(state);
        assert_eq!(restored.next_u64(), generator.next_u64());
        assert_ne!(restored.next_u64(), first);
    }

    #[test]
    fn the_bound_is_respected() {
        let mut generator = Rng::new(3);
        for _ in 0..32 {
            assert!(generator.below(10) < 10);
            assert!(generator.index(5) < 5);
        }
    }

    #[test]
    fn a_bound_of_zero_does_not_divide_by_zero() {
        let mut generator = Rng::new(3);
        assert_eq!(generator.below(0), 0);
        assert_eq!(generator.index(0), 0);
    }

    #[test]
    fn the_mixing_function_is_stable() {
        assert_eq!(mix(0), mix(0));
        assert_ne!(mix(0), mix(1));
    }
}
