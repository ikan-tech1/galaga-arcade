//! Deterministic XorShift32 RNG. The TS engine seeds this per-stage so all
//! enemy choices, dive picks, and bullet timing are reproducible for golden-
//! frame tests.

#[derive(Debug, Clone)]
pub struct XorShift32 {
    state: u32,
}

impl XorShift32 {
    pub fn new(seed: u32) -> Self {
        Self {
            state: if seed == 0 { 0x9E37_79B9 } else { seed },
        }
    }

    #[inline]
    pub fn next(&mut self) -> u32 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.state = x;
        x
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn distribution_is_reasonable() {
        let mut r = XorShift32::new(1);
        let mut buckets = [0u32; 10];
        for _ in 0..10_000 {
            buckets[(r.next() % 10) as usize] += 1;
        }
        for &b in &buckets {
            assert!(b > 700 && b < 1300, "bucket={b}");
        }
    }
}
