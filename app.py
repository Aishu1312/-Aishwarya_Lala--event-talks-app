import os
import re
import urllib.request
import xml.etree.ElementTree as ET
import time
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Cache configuration
FEED_CACHE = {
    "data": None,
    "last_fetched": 0,
    "expiry_seconds": 600  # 10 minutes cache
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
NAMESPACES = {'atom': 'http://www.w3.org/2005/Atom'}

def clean_html_to_plain_text(html):
    """
    Cleans HTML content to a plain text representation suitable for sharing (e.g. on Twitter/X).
    Replaces link tags with their plain text, simplifies whitespace, and removes other tags.
    """
    if not html:
        return ""
    # Replace link tags with just their text to save space in tweets
    cleaned = re.sub(r'<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)</a>', r'\2', html)
    # Strip any remaining tags
    cleaned = re.sub(r'<[^>]+>', ' ', cleaned)
    # Standardize whitespace and clean entities
    cleaned = re.sub(r'\s+', ' ', cleaned)
    cleaned = cleaned.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")
    return cleaned.strip()

def parse_content_html(html, date_str, base_link):
    """
    Splits the HTML content of a single feed entry by H3 tags
    and returns a list of individual release items.
    """
    if not html:
        return []
    
    # Split by H3 headers (case insensitive)
    # Using re.split with a capturing group keeps the match (the header text) in the result
    parts = re.split(r'<h3>(.*?)</h3>', html, flags=re.IGNORECASE)
    
    items = []
    # parts[0] is the content before the first H3 tag (usually empty or whitespace)
    # parts[1] is the first header text, parts[2] is the content after it, etc.
    i = 1
    while i < len(parts) - 1:
        item_type = parts[i].strip()
        item_content = parts[i+1].strip()
        
        # Unique identifier for frontend reference and selection key
        item_id = f"{date_str.replace(' ', '_').lower()}-{i}"
        plain_text = clean_html_to_plain_text(item_content)
        
        # Build category-specific anchor link (if available)
        # Google release notes often anchor updates to date, e.g., #June_15_2026
        anchor = date_str.replace(' ', '_')
        link_with_anchor = f"{base_link}#{anchor}" if base_link else ""
        
        items.append({
            'id': item_id,
            'date': date_str,
            'type': item_type,
            'content': item_content,
            'plain_text': plain_text,
            'link': link_with_anchor or base_link
        })
        i += 2
        
    # If no H3 tags were matched, return the entire content block as one update
    if not items:
        item_id = f"{date_str.replace(' ', '_').lower()}-0"
        plain_text = clean_html_to_plain_text(html)
        items.append({
            'id': item_id,
            'date': date_str,
            'type': 'Update',
            'content': html,
            'plain_text': plain_text,
            'link': base_link
        })
        
    return items

def fetch_and_parse_feed():
    """
    Fetches the XML feed from the official URL, parses the entries,
    and structures them into a list of dictionaries.
    """
    req = urllib.request.Request(
        FEED_URL,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AntigravityReleaseNotesTracker/1.0'}
    )
    
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
        
    root = ET.fromstring(xml_data)
    releases = []
    
    for entry in root.findall('atom:entry', NAMESPACES):
        title_elem = entry.find('atom:title', NAMESPACES)
        date_str = title_elem.text.strip() if title_elem is not None else "Unknown Date"
        
        link_elem = entry.find("atom:link[@rel='alternate']", NAMESPACES)
        base_link = link_elem.attrib.get('href', '').strip() if link_elem is not None else ''
        
        content_elem = entry.find('atom:content', NAMESPACES)
        content_html = content_elem.text if content_elem is not None else ''
        
        parsed_items = parse_content_html(content_html, date_str, base_link)
        releases.extend(parsed_items)
        
    return releases

@app.route('/')
def index():
    """Renders the main single-page application dashboard."""
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    """
    JSON API endpoint for release notes.
    Supports ?refresh=true to clear cache and pull live data.
    """
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    # Check if cache is still valid and not forced to refresh
    if (not force_refresh and 
        FEED_CACHE["data"] is not None and 
        (now - FEED_CACHE["last_fetched"]) < FEED_CACHE["expiry_seconds"]):
        return jsonify({
            "status": "success",
            "source": "cache",
            "last_fetched": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(FEED_CACHE["last_fetched"])),
            "releases": FEED_CACHE["data"]
        })
        
    try:
        data = fetch_and_parse_feed()
        FEED_CACHE["data"] = data
        FEED_CACHE["last_fetched"] = now
        return jsonify({
            "status": "success",
            "source": "live",
            "last_fetched": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(now)),
            "releases": data
        })
    except Exception as e:
        # If fetch fails but we have cached data, return cached data as fallback
        if FEED_CACHE["data"] is not None:
            return jsonify({
                "status": "partial_success",
                "source": "cache_fallback",
                "error": str(e),
                "last_fetched": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(FEED_CACHE["last_fetched"])),
                "releases": FEED_CACHE["data"]
            })
        return jsonify({
            "status": "error",
            "message": "Failed to fetch and parse release notes.",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    # Run locally on port 5000
    app.run(debug=True, host='0.0.0.0', port=5000)
