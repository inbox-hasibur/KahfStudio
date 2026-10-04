"""
News Candidate Validator (Zero External LLM / Zero Tokens)
Pure Python regex & algorithmic rules to discard navigation menus,
image placeholders, UI junk, and sponsored clickbait advertisements.
"""

import re
from urllib.parse import urlparse

JUNK_TITLE_PATTERNS = [
    re.compile(r"^!*image\s*\d*", re.I),
    re.compile(r"^!*\[*image", re.I),
    re.compile(r"^skip to ", re.I),
    re.compile(r"^about us$", re.I),
    re.compile(r"^contact( us)?$", re.I),
    re.compile(r"^privacy policy$", re.I),
    re.compile(r"^terms( of service| of use)?$", re.I),
    re.compile(r"^advertisement$", re.I),
    re.compile(r"^cookie policy$", re.I),
    re.compile(r"^subscribe$", re.I),
    re.compile(r"^log in$", re.I),
    re.compile(r"^sign up$", re.I),
    re.compile(r"^e-paper$", re.I),
    re.compile(r"^archives?$", re.I),
    re.compile(r"^opinion$", re.I),
    re.compile(r"^editorial$", re.I),
    re.compile(r"^entertainment$", re.I),
    re.compile(r"^sports$", re.I),
    re.compile(r"^business$", re.I),
    re.compile(r"^lifestyle$", re.I),
    re.compile(r"^bangladesh$", re.I),
    re.compile(r"^all categories$", re.I),
    re.compile(r"^home$", re.I),
]

UI_JUNK_REGEX = re.compile(
    r"\b(more-menu|burger-menu|navigation-menu|categories-menu|search icon|dark mode|media accounts? icon|imageicon|cardimage|theme\d+slider)\b",
    re.I
)

SPONSORED_PATTERNS = [
    re.compile(r"cash back card", re.I),
    re.compile(r"best credit card", re.I),
    re.compile(r"home equity into cash", re.I),
    re.compile(r"want cash out of your home", re.I),
    re.compile(r"ink-sane value", re.I),
    re.compile(r"top buys.*worth your cash", re.I),
    re.compile(r"best cash back", re.I),
]

def is_valid_news_candidate(title: str, url: str) -> bool:
    """
    Validates whether a candidate headline & URL qualify as real news.
    Executes in microseconds with zero token consumption.
    """
    if not title or not url:
        return False
    
    clean_title = title.strip()
    
    # 1. Length & word count check
    if len(clean_title) < 20:
        return False
    words = clean_title.split()
    if len(words) < 4:
        return False
        
    # 2. Reject image placeholders / markdown alt tags
    if clean_title.startswith("!") or clean_title.startswith("["):
        return False
    if re.match(r"^!?\[?(image|photo|figure|img|pic|picture)\b", clean_title, re.I):
        return False
        
    # 3. Reject UI artifacts & buttons
    if UI_JUNK_REGEX.search(clean_title):
        return False
    if re.search(r"(icon|menu|logo|button|thumbnail|banner|widget)$", clean_title, re.I):
        return False
        
    # 4. Reject sponsored ad spam
    for pattern in SPONSORED_PATTERNS:
        if pattern.search(clean_title):
            return False
            
    if re.search(r"\b(credit card|cashback|cash back)\b", clean_title, re.I):
        if not re.search(r"\b(scam|fraud|police|bank|central bank|বাংলাদেশ ব্যাংক)\b", clean_title, re.I):
            return False
            
    # 5. Reject generic section headers
    for pattern in JUNK_TITLE_PATTERNS:
        if pattern.search(clean_title):
            return False
            
    # 6. URL structure check
    try:
        parsed = urlparse(url)
        path = parsed.path.lower()
        if not path or path == "/":
            return False
        if re.search(r"\.(jpg|jpeg|png|gif|webp|svg|css|js|woff|woff2|ttf|ico|pdf|zip)$", path):
            return False
        if re.search(r"^/(category|tag|tags|topic|topics|section|author|page|search|feed)/?$", path):
            return False
        if re.search(r"(login|signup|register|user|auth|cart|checkout)", path):
            return False
    except Exception:
        return False
        
    return True
