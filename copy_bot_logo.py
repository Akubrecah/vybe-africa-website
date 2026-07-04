import shutil
import os

src = "/Users/Akubrecah/.gemini/antigravity-ide/brain/2219a80c-4416-48c5-8284-274956f1c3df/bot_logo_1783166634645.png"
dst = "assets/images/bot-logo.png"

print(f"Copying bot logo from:\n  {src}\nto:\n  {dst}...")

try:
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    print("✓ Success! Bot logo copied.")
except Exception as e:
    print(f"✗ Failed: {e}")
    print("Please run this script in your local terminal outside the IDE sandbox.")
