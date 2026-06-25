use std::env;
use std::path::PathBuf;

fn main() {
    if env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("macos") {
        return;
    }

    let out_dir = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR must be set by cargo"));
    let source = PathBuf::from("native/macos_accessibility.m");

    cc::Build::new()
        .file(&source)
        .flag("-fobjc-arc")
        .compile("smartup_macos_accessibility");

    println!("cargo:rustc-link-search=native={}", out_dir.display());
    println!("cargo:rustc-link-lib=static=smartup_macos_accessibility");
    println!("cargo:rustc-link-lib=framework=ApplicationServices");
    println!("cargo:rustc-link-lib=framework=Foundation");
    println!("cargo:rustc-link-lib=framework=Carbon");
    println!("cargo:rerun-if-changed={}", source.display());
}
