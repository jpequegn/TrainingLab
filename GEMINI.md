# GEMINI.md

## Project Overview

This project is a web-based Zwift workout visualizer. It allows users to upload `.zwo` (Zwift workout) files, view them as interactive graphs, and analyze various metrics like Training Stress Score (TSS). The application also supports converting workouts to other formats (ERG, MRC) and includes a chat interface for generating workouts using natural language.

The project features a modern, angular UI design and is a hybrid, with a JavaScript frontend and a Python backend.

**Frontend:**

*   **Framework/Libraries:** Vanilla JavaScript, Chart.js for graphing.
*   **Build/Package Manager:** npm
*   **Core Files:**
    *   `index.html`: Main application page, featuring the latest UI design.
    *   `index-legacy.html`: The previous version of the UI, for reference.
    *   `script.js`: Main application logic.
    *   `ui.js`: UI management.
    *   `workout.js`: Workout data logic.
    *   `parser.js`: `.zwo` file parsing.
    *   `exporter.js`: Workout export functionality.

**Backend:**

*   **Language:** Python
*   **Framework:** Standard library `http.server`.
*   **Core Files:**
    *   `server.py`: Main server logic, handles API requests.
    *   `mcp_manager.py`: Manages Multi-Component Protocol (MCP) servers.
    *   `workout_mcp_server.py`: An MCP server for workout generation.

## Building and Running

### Frontend

The frontend is a static application that can be served by any web server. The included Python server handles this automatically.

### Backend

1.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

2.  **Run the Server:**
    ```bash
    python3 server.py
    ```

    The server will be available at `http://localhost:12000`.

### Development

*   **Linting:**
    *   JavaScript: `npm run lint`
    *   Python: `npm run lint:py` (uses `ruff`)
*   **Testing:**
    *   Unit Tests: `npm test` (uses `vitest`)
    *   End-to-End Tests: `npm run test:e2e` (uses `playwright`)

## Development Conventions

*   **Code Style:**
    *   JavaScript: ESLint is used for linting. See `.eslintrc.json` for configuration.
    *   Python: Ruff is used for linting. See `.ruff.toml` for configuration.
*   **Modularity:** The JavaScript code is organized into modules (`/components`, `/utils`) to separate concerns.
*   **State Management:** A simple state manager is implemented in `state-manager.js`.
*   **Error Handling:** The application includes global error handling for both JavaScript errors and unhandled promise rejections in `script.js`.
*   **Security:** The Python server includes security features like CORS headers, Content Security Policy (CSP), and input validation.