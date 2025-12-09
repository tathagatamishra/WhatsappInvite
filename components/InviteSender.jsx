"use client";
import React, { useState } from "react";
import axios from "axios";

export default function InviteSender() {
  const [recipientsText, setRecipientsText] = useState("");
  const [message, setMessage] = useState(
    "Hi {{name}}, you're invited!\nEvent: {{event}}\nDetails: {{link}}"
  );
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [links, setLinks] = useState([]);
  const [baseUrl, setBaseUrl] = useState("");

  const parseRecipients = (text) => {
    // Accepts CSV/newline separated list. Normalize numbers to digits only.
    return text
      .split(/[,\n]/)
      .map((s) => s.replace(/[^+0-9]/g, ""))
      .map((s) => s.replace(/^\+/, ""))
      .filter(Boolean);
  };

  async function handleUploadImage() {
    if (!imageFile) return null;
    setUploading(true);
    const fd = new FormData();
    fd.append("image", imageFile);
    try {
      const res = await axios.post(
        "http://localhost:4000/api/upload-image",
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      setUploading(false);
      setBaseUrl(res.data.imageUrl);
      return res.data.imageUrl;
    } catch (err) {
      setUploading(false);
      alert("Image upload failed");
      console.error(err);
      return null;
    }
  }

  async function handleGenerateLinks(e) {
    e.preventDefault();
    const recipients = parseRecipients(recipientsText);
    if (!recipients.length) return alert("Add at least one recipient number.");

    let imageUrl = baseUrl;
    if (imageFile && !imageUrl) {
      imageUrl = await handleUploadImage();
      if (!imageUrl) return;
    }

    const payload = { recipients, message, imageUrl };
    try {
      const res = await axios.post(
        "http://localhost:4000/api/generate-links",
        payload
      );
      setLinks(res.data.links);
    } catch (err) {
      console.error(err);
      alert("Failed to generate links");
    }
  }

  function copyAll() {
    const text = links.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      alert("All links copied to clipboard");
    });
  }

  function downloadCSV() {
    const csv = links.join("\n");
    const blob = new Blob([csv], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "whatsapp-links.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Opens links sequentially with a small delay to reduce popup-blocking risk.
  // Still likely blocked if browser considers it programmatic; best on user-initiated click.
  function openSequentially() {
    if (!links.length) return;
    let i = 0;
    const delay = 700; // ms between opens (tweak as needed)
    function openNext() {
      if (i >= links.length) return;
      window.open(links[i], "_blank");
      i++;
      setTimeout(openNext, delay);
    }
    openNext();
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">
        Create WhatsApp Invite Links
      </h2>
      <form onSubmit={handleGenerateLinks} className="space-y-4">
        <label className="block">
          <div className="text-sm font-medium">
            Recipients (one per line or comma separated)
          </div>
          <textarea
            value={recipientsText}
            onChange={(e) => setRecipientsText(e.target.value)}
            rows={6}
            className="mt-1 w-full rounded border p-2"
            placeholder={`Example:\n+919876543210\n9876543211, 911234567890`}
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Invitation image (optional)</div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          />
          {uploading && <div className="text-xs mt-1">Uploading...</div>}
        </label>

        <label className="block">
          <div className="text-sm font-medium">
            Message (use placeholders like {"{"}
            {"name"}
            {"}"} )
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="mt-1 w-full rounded border p-2"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Generate Links
          </button>
          <button
            type="button"
            onClick={() => {
              setRecipientsText("");
              setMessage("");
              setLinks([]);
            }}
            className="px-4 py-2 border rounded"
          >
            Reset
          </button>
        </div>
      </form>

      {links.length > 0 && (
        <section className="mt-6">
          <h3 className="font-medium">Links ({links.length})</h3>
          <div className="mt-2 grid gap-2">
            <div className="flex gap-2">
              <button onClick={copyAll} className="px-3 py-1 border rounded">
                Copy all
              </button>
              <button
                onClick={downloadCSV}
                className="px-3 py-1 border rounded"
              >
                Download
              </button>
              <button
                onClick={openSequentially}
                className="px-3 py-1 border rounded"
              >
                Open sequentially
              </button>
            </div>
            <div className="max-h-64 overflow-auto border rounded p-2 bg-white">
              {links.map((l, idx) => (
                <div key={idx} className="text-sm break-all mb-1">
                  <a
                    href={l}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {l}
                  </a>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-600">
              Tip: On mobile, opening one link will open WhatsApp with the
              message; you can paste/send it to multiple recipients there.
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
