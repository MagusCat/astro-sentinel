Follow this style programing and design with this concepts, KISS-first architecture focused on simplicity, readability, maintainability, and rapid development.
Avoid overengineering at all costs.

# Core Principles
- Keep code simple and predictable
- Prefer readability over abstraction
- Use DRY only when duplication is real
- Avoid premature optimization
- Avoid unnecessary architectural patterns
- Prefer composition over complex inheritance
- Keep files small and focused
- Use clear and explicit naming

# Code Standards
- Use standard TypeScript patterns
- Use strict typing where relevant
- Prefer functional components
- Use async/await consistently
- Avoid deeply nested logic
- Avoid giant components
- Avoid magic values
- Keep business logic separated from UI

Comments should only exist when:
- dont comment HTML only if is necesary
- logic is non-obvious
- documenting edge cases
- clarifying important decisions

If something is incomplete:
- mark it using TODO:
- add a short clear description

Example:
TODO: Implement membership expiration validation.

# UI/UX Rules
The UI must feel:
- modern
- clean
- calm
- touch-friendly
- intuitive for non-technical users

Prioritize:
- whitespace
- readable typography
- large touch targets
- simple navigation
- modular layouts
- responsive tablet-first design

Avoid:
- visual clutter
- excessive animations
- overly complex interactions
- unnecessary gradients

## Design Features System
Use: https://ui.shadcn.com/

Color Palette:
- Primary Blue: #3B82F6
- Light Blue: #60A5FA
- Dark Surface: #1F2937
- Soft Background: #E0F2FE
- Accent Purple: #A78BFA
- Deep Purple: #7C3AED

Design Language:
- rounded-lg and rounded-md components
- minimal borders
- whitespace-heavy layouts
- clear hierarchy
- large readable typography
- touch-friendly buttons and inputs
- responsive grid layouts

Animation Style:
- smooth microinteractions
- subtle hover feedback
- gentle transitions
- no distracting motion
- premium SaaS feeling

# Folder Structure
Use this simplified modular structure:

src/
├── app/
├── components/
│   ├── ui/
│   ├── layout/
│   └── shared/
├── features/
│   ├── auth/
│   ├── members/
│   ├── memberships/
│   ├── payments/
│   ├── classes/
│   └── dashboard/
├── lib/
├── stores/
├── styles/
├── types/
└── middleware.ts

# Feature Structure
Each feature should stay simple:

feature/
├── components/
├── actions.ts
├── queries.ts
├── schema.ts
├── types.ts
└── utils.ts

If components can be simple keep it.
Only create additional folders if complexity genuinely requires it.

# Architecture Rules
- Use Server Components by default
- Use Server Actions for mutations
- Use Zustand only for global UI state
- Keep Supabase logic centralized
- Keep routing inside app/
- Keep reusable UI inside components/

# Naming Conventions
Use kebab-case for files.

Examples:
- member-form.tsx
- create-payment.ts
- dashboard-card.tsx

Avoid generic names like:
- helpers.ts
- misc.ts
- stuff.ts

# Development Workflow
Before implementing:
1. analyze the feature
2. suggest the simplest solution
3. avoid unnecessary abstractions
4. explain architecture decisions briefly

Always prioritize:
- maintainability
- clarity
- scalability through simplicity