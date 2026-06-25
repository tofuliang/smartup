use std::io::{Error, ErrorKind, Read, Write};

pub const HEADER_LEN: usize = 4;

pub fn write_frame<W: Write>(mut writer: W, payload: &[u8]) -> std::io::Result<()> {
    let len = u32::try_from(payload.len()).map_err(|_| {
        Error::new(
            ErrorKind::InvalidInput,
            "native messaging payload exceeds u32 length limit",
        )
    })?;

    writer.write_all(&len.to_le_bytes())?;
    writer.write_all(payload)
}

pub fn read_frame<R: Read>(mut reader: R) -> std::io::Result<Vec<u8>> {
    let mut header = [0_u8; HEADER_LEN];
    reader.read_exact(&mut header)?;

    let len = u32::from_le_bytes(header) as usize;
    let mut payload = vec![0_u8; len];
    reader.read_exact(&mut payload)?;
    Ok(payload)
}
