# @runstamp/protocol

Semantic schema package for Runstamp V2.

This package is internal/private in the current hardening pass.

It exists so the hosted runtime and internal services can share versioned types,
validators, and compiler behavior for the public `PresentationSpec` contract.
External users should treat `PresentationSpec` as a documented wire contract,
not as a supported npm dependency.
