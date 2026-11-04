"""Automated Git repository initializer and GitHub preparation script for RESQFLY."""
import os
import sys
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

def run_cmd(cmd_list, cwd=REPO_ROOT):
    """Runs a shell command and returns (returncode, stdout, stderr)."""
    p = subprocess.run(cmd_list, cwd=cwd, text=True, capture_output=True)
    return p.returncode, p.stdout.strip(), p.stderr.strip()

def main():
    print("=" * 65)
    print("[*] RESQFLY - Automated Git Repository Setup & Verification")
    print("=" * 65)

    # 1. Verify .gitignore protection
    gitignore_path = REPO_ROOT / ".gitignore"
    if not gitignore_path.exists():
        print("[!] .gitignore not found. Aborting for safety.")
        sys.exit(1)

    with open(gitignore_path, "r", encoding="utf-8") as f:
        gi_content = f.read()

    required_patterns = ["backend/.env", "node_modules", "__pycache__"]
    for pat in required_patterns:
        if pat not in gi_content:
            print(f"[!] Warning: '{pat}' missing from .gitignore. Adding it now...")
            with open(gitignore_path, "a", encoding="utf-8") as f:
                f.write(f"\n{pat}\n")

    print("[*] .gitignore security checklist verified. Secrets protected.")

    # 2. Check or initialize Git repository
    git_dir = REPO_ROOT / ".git"
    if not git_dir.exists():
        print("[*] Initializing new Git repository...")
        code, out, err = run_cmd(["git", "init"])
        if code != 0:
            print(f"[!] Git init failed: {err}")
            sys.exit(1)
        print("    -> Git repository initialized.")
    else:
        print("[*] Git repository already initialized.")

    # 3. Configure Git user if not already set locally
    code, out, err = run_cmd(["git", "config", "user.name"])
    if code != 0 or not out:
        run_cmd(["git", "config", "user.name", "Deepadharshan"])
        run_cmd(["git", "config", "user.email", "deepadharshan@iithackathon.org"])
        print("[*] Configured Git user: Deepadharshan <deepadharshan@iithackathon.org>")

    # 4. Stage all tracked and new files
    print("[*] Staging files (git add .)...")
    code, out, err = run_cmd(["git", "add", "."])
    if code != 0:
        print(f"[!] Git add failed: {err}")
        sys.exit(1)

    # 5. Safety check: Ensure backend/.env was NOT staged
    code, out, err = run_cmd(["git", "status", "--porcelain"])
    staged_lines = out.splitlines()
    for line in staged_lines:
        if ".env" in line and not line.endswith(".example"):
            print(f"[!] FATAL: Secret file was staged: {line}")
            print("    Resetting staging area...")
            run_cmd(["git", "reset"])
            sys.exit(1)

    print(f"[*] Verified: Zero secret files staged ({len(staged_lines)} safe project files ready).")

    # 6. Commit
    commit_msg = "feat: complete RESQFLY IIT Hackathon submission with AWS DynamoDB, IoT Core, and Halloween aesthetic UI"
    print(f"[*] Committing changes: \"{commit_msg}\"...")
    code, out, err = run_cmd(["git", "commit", "-m", commit_msg])
    if code == 0:
        print("    -> Commit created successfully!")
    else:
        if "nothing to commit" in out or "nothing to commit" in err:
            print("    -> Working directory clean. (Nothing new to commit).")
        else:
            print(f"[!] Commit note: {out or err}")

    # 7. Check for GitHub Remote
    code, out, err = run_cmd(["git", "remote", "-v"])
    print("\n" + "=" * 65)
    if out:
        print(f"[*] Active Remote Repositories:\n{out}")
        print("\nTo push immediately to GitHub, run:")
        print("    git push -u origin main")
    else:
        print("[*] No Git Remote configured yet.")
        print("\nTo link and push your GitHub repository, run:")
        print("    git remote add origin https://github.com/<your-username>/resqfly.git")
        print("    git branch -M main")
        print("    git push -u origin main")
    print("=" * 65)

if __name__ == "__main__":
    main()
