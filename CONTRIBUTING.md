
Contributing
Workflow
Create a feature branch.
Make focused changes.
Run tests.
Run syntax checks.
Run git diff --check.
Commit with a clear message.
Open a pull request.
Before Committing
pytest
python -m py_compile app\main.py app\schemas.py
git diff --check

Never commit secrets, .env files, credentials, or production database information.
