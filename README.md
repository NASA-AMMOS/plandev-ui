![GitHub package.json version](https://img.shields.io/github/package-json/v/NASA-AMMOS/aerie-ui?color=brightgreen)

# aerie-ui

The client application for [PlanDev](https://github.com/NASA-AMMOS/aerie).

## Rebranding Notice

**Aerie has been rebranded to PlanDev and SeqDev.**

- **PlanDev**: The planning, scheduling, and constraint-checking components
- **SeqDev**: The sequencing, command dictionary, and workspace components

This repository contains the UI for both PlanDev and SeqDev. The name of this repository, code, and internal documentation will remain branded as Aerie for the time being.

For the latest documentation, visit: [PlanDev Documentation](https://nasa-ammos.github.io/plandev-docs/)

<span style="display:block;text-align:center">![Example](/docs/images/Full_Example.png)</span>

## Need Help?

- Join us on the [NASA-AMMOS Slack](https://join.slack.com/t/nasa-ammos/shared_invite/zt-1mlgmk5c2-MgqVSyKzVRUWrXy87FNqPw) (#plandev-users)
- Contact plandev-support@googlegroups.com

## Directory Structure

```sh
.
├── .github         # GitHub metadata
├── .vscode         # VS Code settings
├── docs            # Documentation
├── e2e-tests       # End-to-end tests
├── scripts         # Helper build scripts
└── src             # The source code
    ├── assets      # Additional assets
    ├── components  # Svelte components
    ├── css         # Style sheets
    ├── routes      # Svelte Kit route components
    ├── stores      # Svelte stores
    ├── types       # Global TypeScript types
    └── utilities   # Functions and constant values
└── static          # Statically served files
```

## Want to help?

Want to file a bug, contribute some code, or improve documentation? Excellent! Read up on our
guidelines for [contributing][contributing]. If you are a developer you can get started quickly by reading the [developer documentation][dev].

[contributing]: ./docs/CONTRIBUTING.md
[dev]: ./docs/DEVELOPER.md

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE).
