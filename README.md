![GitHub package.json version](https://img.shields.io/github/package-json/v/NASA-AMMOS/plandev-ui?color=brightgreen)

# plandev-ui

The client application for [PlanDev](https://github.com/NASA-AMMOS/plandev).

## Aerie -> PlanDev Rebrand

This product was **formerly known as Aerie and is now named PlanDev**. While we've updated most documentation and external references, some legacy mentions of the old product name may remain as we complete the transition.

What to know:

- The planning product, including modeling, simulation, scheduling and constraint-checking, is now named PlanDev
- The sequencing product, including the sequence editor, workspaces, and actions, is now named SeqDev
- All features and functionality remain the same
- Currently, package names and other internal code references will retain their existing names, and deployment/migration procedures have not changed
- In a future release, our package names may change. If so, this will be communicated to users via release notes and normal communication channels

For the latest documentation, visit: [PlanDev Documentation](https://nasa-ammos.github.io/plandev-docs/)

<span style="display:block;text-align:center">![Example](/docs/images/Full_Example.png)</span>

## Need Help?

- Join us on the [NASA-AMMOS Slack](https://join.slack.com/t/nasa-ammos/shared_invite/zt-1mlgmk5c2-MgqVSyKzVRUWrXy87FNqPw) (#plandev-users)
- Contact plandev-support@googlegroups.com
- Report security vulnerabilities per [SECURITY.md](./SECURITY.md)

## Getting Started

PlanDev UI requires Node.js (see [`.nvmrc`](./.nvmrc)), Java, Docker, and a local checkout of the [PlanDev backend](https://github.com/NASA-AMMOS/plandev). For full setup instructions see [docs/DEVELOPER.md](./docs/DEVELOPER.md).

```sh
nvm use
npm install
npm run dev
```

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

Want to file a bug, contribute some code or improve documentation? Excellent! Read up on our
guidelines for [contributing][contributing] and our [code of conduct][coc]. If you are a developer you can get started quickly by reading the [developer documentation][dev].

[coc]: ./CODE_OF_CONDUCT.md
[contributing]: ./CONTRIBUTING.md
[dev]: ./docs/DEVELOPER.md

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE).
