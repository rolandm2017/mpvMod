<!-- https://claude.ai/chat/8ccd878a-3e4c-4f28-8552-ac09ab597623 -->

<!-- You should go LOOK at this code and see what it's aesthetic is like. it's beautiful -->

<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Field Mapping UI Improvements</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #1a1a1a;
                color: #e0e0e0;
                padding: 20px;
            }

            .container {
                max-width: 1200px;
                margin: 0 auto;
            }

            h2 {
                margin-bottom: 30px;
                color: #fff;
            }

            .mapping-grid {
                display: grid;
                gap: 20px;
                margin-bottom: 30px;
            }

            .mapping-card {
                background: #2a2a2a;
                border: 2px solid #333;
                border-radius: 12px;
                padding: 20px;
                transition: all 0.3s ease;
            }

            .mapping-card.connected {
                border-color: #28a745;
                background: linear-gradient(135deg, #2a2a2a 0%, #1e3a1e 100%);
            }

            .mapping-card.required {
                border-left: 4px solid #ffc107;
            }

            .mapping-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }

            .field-title {
                font-size: 16px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .field-badge {
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
                text-transform: uppercase;
            }

            .badge-required {
                background: #ffc107;
                color: #000;
            }

            .badge-optional {
                background: #444;
                color: #aaa;
            }

            .field-description {
                color: #888;
                font-size: 13px;
                margin-bottom: 12px;
            }

            .mapping-visual {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-top: 15px;
            }

            .source-box,
            .target-box {
                flex: 1;
                padding: 12px;
                border-radius: 8px;
                text-align: center;
                font-size: 14px;
            }

            .source-box {
                background: #1e3a5f;
                border: 2px solid #2e5a8f;
                color: #a0c4ff;
            }

            .target-dropdown {
                flex: 1;
                position: relative;
            }

            .dropdown-select {
                width: 100%;
                padding: 12px;
                background: #333;
                border: 2px solid #555;
                border-radius: 8px;
                color: #e0e0e0;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .dropdown-select:hover {
                border-color: #777;
            }

            .dropdown-select:focus {
                outline: none;
                border-color: #0077cc;
                box-shadow: 0 0 0 3px rgba(0, 119, 204, 0.2);
            }

            .arrow-connector {
                color: #666;
                font-size: 24px;
            }

            .preview-section {
                background: #2a2a2a;
                border: 2px solid #333;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 30px;
            }

            .preview-title {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 15px;
                color: #fff;
            }

            .preview-content {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }

            .preview-item {
                padding: 10px;
                background: #1a1a1a;
                border-radius: 6px;
                border: 1px solid #444;
            }

            .preview-item.unmapped {
                opacity: 0.5;
                border-style: dashed;
            }

            .preview-label {
                font-size: 12px;
                color: #888;
                margin-bottom: 4px;
            }

            .preview-value {
                font-size: 14px;
                color: #e0e0e0;
            }

            .auto-detect-section {
                background: #1e3a5f;
                border: 2px solid #2e5a8f;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 30px;
            }

            .auto-detect-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }

            .auto-detect-title {
                font-size: 16px;
                font-weight: 600;
                color: #a0c4ff;
            }

            .auto-detect-btn {
                padding: 8px 16px;
                background: #0077cc;
                border: none;
                border-radius: 6px;
                color: white;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .auto-detect-btn:hover {
                background: #0066bb;
                transform: translateY(-1px);
            }

            .suggestion-list {
                display: grid;
                gap: 10px;
            }

            .suggestion-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 6px;
            }

            .suggestion-text {
                font-size: 14px;
            }

            .confidence-badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
            }

            .confidence-high {
                background: #28a745;
                color: white;
            }

            .confidence-medium {
                background: #ffc107;
                color: #000;
            }

            .confidence-low {
                background: #dc3545;
                color: white;
            }

            .action-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                background: #333;
                border-radius: 12px;
            }

            .action-group {
                display: flex;
                gap: 12px;
            }

            button {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .btn-primary {
                background: #0077cc;
                color: white;
            }

            .btn-primary:hover {
                background: #0066bb;
            }

            .btn-secondary {
                background: #555;
                color: #e0e0e0;
            }

            .btn-secondary:hover {
                background: #666;
            }

            .btn-success {
                background: #28a745;
                color: white;
            }

            .btn-success:hover {
                background: #218838;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Field Mapping Configuration - Enhanced UI Concept</h2>

            <!-- Auto-detection suggestion panel -->
            <div class="auto-detect-section">
                <div class="auto-detect-header">
                    <div class="auto-detect-title">🔍 Smart Mapping Suggestions</div>
                    <button class="auto-detect-btn">Auto-Detect Mappings</button>
                </div>
                <div class="suggestion-list">
                    <div class="suggestion-item">
                        <span class="suggestion-text">Target Word → "Word" field</span>
                        <span class="confidence-badge confidence-high">95% match</span>
                    </div>
                    <div class="suggestion-item">
                        <span class="suggestion-text">Example Sentence → "Example Sentence" field</span>
                        <span class="confidence-badge confidence-high">100% match</span>
                    </div>
                    <div class="suggestion-item">
                        <span class="suggestion-text">Native Translation → "word_audio" field</span>
                        <span class="confidence-badge confidence-low">30% match</span>
                    </div>
                </div>
            </div>

            <!-- Visual field mapping cards -->
            <div class="mapping-grid">
                <div class="mapping-card connected required">
                    <div class="mapping-header">
                        <div class="field-title">
                            Target Word
                            <span class="field-badge badge-required">Required</span>
                        </div>
                        <span style="color: #28a745;">✓ Mapped</span>
                    </div>
                    <div class="field-description">The word or phrase being learned</div>
                    <div class="mapping-visual">
                        <div class="source-box">Target Word</div>
                        <div class="arrow-connector">→</div>
                        <div class="target-dropdown">
                            <select class="dropdown-select">
                                <option>Word</option>
                                <option>Front</option>
                                <option>Expression</option>
                                <option>Target</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="mapping-card connected required">
                    <div class="mapping-header">
                        <div class="field-title">
                            Example Sentence
                            <span class="field-badge badge-required">Required</span>
                        </div>
                        <span style="color: #28a745;">✓ Mapped</span>
                    </div>
                    <div class="field-description">Context sentence containing the target word</div>
                    <div class="mapping-visual">
                        <div class="source-box">Example Sentence</div>
                        <div class="arrow-connector">→</div>
                        <div class="target-dropdown">
                            <select class="dropdown-select">
                                <option>Example Sentence</option>
                                <option>Sentence</option>
                                <option>Context</option>
                                <option>Back</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="mapping-card">
                    <div class="mapping-header">
                        <div class="field-title">
                            Native Translation
                            <span class="field-badge badge-optional">Optional</span>
                        </div>
                        <span style="color: #ffc107;">⚠ Check mapping</span>
                    </div>
                    <div class="field-description">Translation in your native language</div>
                    <div class="mapping-visual">
                        <div class="source-box">Native Translation</div>
                        <div class="arrow-connector">→</div>
                        <div class="target-dropdown">
                            <select class="dropdown-select">
                                <option>word_audio</option>
                                <option>Translation</option>
                                <option>Meaning</option>
                                <option>Definition</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Live preview section -->
            <div class="preview-section">
                <div class="preview-title">📋 Live Card Preview</div>
                <div class="preview-content">
                    <div class="preview-item">
                        <div class="preview-label">Word</div>
                        <div class="preview-value">家族 (かぞく)</div>
                    </div>
                    <div class="preview-item">
                        <div class="preview-label">Example Sentence</div>
                        <div class="preview-value">私の家族は四人です。</div>
                    </div>
                    <div class="preview-item unmapped">
                        <div class="preview-label">word_audio</div>
                        <div class="preview-value">[Unmapped - will be empty]</div>
                    </div>
                    <div class="preview-item">
                        <div class="preview-label">sentence_audio</div>
                        <div class="preview-value">[Audio file]</div>
                    </div>
                    <div class="preview-item">
                        <div class="preview-label">image</div>
                        <div class="preview-value">[Screenshot]</div>
                    </div>
                </div>
            </div>

            <!-- Action bar -->
            <div class="action-bar">
                <div class="action-group">
                    <button class="btn-secondary">Reset to Defaults</button>
                    <button class="btn-secondary">Import Profile</button>
                    <button class="btn-secondary">Export Profile</button>
                </div>
                <div class="action-group">
                    <button class="btn-primary">Test Mapping</button>
                    <button class="btn-success">Save Configuration</button>
                </div>
            </div>
        </div>
    </body>
</html>
