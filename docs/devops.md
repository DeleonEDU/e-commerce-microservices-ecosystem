# DevOps & Quality Gate Setup

## 1. Branch Protection Rules
- Navigate to your GitHub repository -> Settings -> Branches.
- Add a branch protection rule for `main` and `develop`.
- **Require pull request reviews before merging**.
- **Require status checks to pass before merging**.
  - Search and select `test-services`, `sonarcloud`, and `docker-build-all` as mandatory checks.
- Enforce linear history (optional but recommended).

## 2. SonarCloud & Quality Gate
- Connect your repository to SonarCloud.
- Obtain the `SONAR_TOKEN` and add it to GitHub Repository Secrets.
- In SonarCloud, define a Quality Gate with the following constraints:
  - **Coverage on New Code** >= 70%
  - **Overall Coverage** >= 70%
  - **Bugs** = 0
  - **Vulnerabilities** = 0
  - **Security Hotspots Reviewed** = 100%
  - **Code Smells** (Maintainability Rating) = A or B

## 3. CI/CD Artifacts
- The `.github/workflows/ci.yml` pipeline uses `actions/upload-artifact` to gather `coverage.xml` and HTML reports.
- Upon each PR or Push, you can navigate to the "Actions" tab and download the `coverage-report-*-service` ZIP file to view the HTML report locally.
- Pytest runs with `--cov-fail-under=70` per service: the build fails if line coverage for that service drops below 70%.
- Django services use `auth_service.settings_test` and `product_service.settings_test` (SQLite + in-memory cache) so tests do not require PostgreSQL or Redis in CI.

## 4. Sonar configuration
- Root file `sonar-project.properties` holds defaults; the GitHub Action still passes `-Dsonar.projectKey` / `-Dsonar.organization` — align them with your SonarCloud project.
- If `SONAR_TOKEN` is not set in repository secrets, the `sonarcloud` job is skipped (other jobs still run).
