(() => {
  const params = new URLSearchParams(document.currentScript.src.split("?")[1] || "");
  const widgetId = params.get("id");
  const apiBase = new URL(document.currentScript.src).origin;
  if (!widgetId) return;

  fetch(`${apiBase}/api/widgets/${widgetId}/config`)
    .then(r => r.json())
    .then(config => {
      const host = document.createElement("div");
      host.id = `widget-${widgetId}`;
      host.style.cssText = "max-width:420px;padding:20px;border:1px solid #ddd;font-family:Arial,sans-serif;";
      const title = document.createElement("h2");
      title.textContent = config.title;
      host.appendChild(title);
      if (config.description) {
        const p = document.createElement("p");
        p.textContent = config.description;
        host.appendChild(p);
      }

      const form = document.createElement("form");
      for (const field of config.fields || []) {
        const label = document.createElement("label");
        label.style.display = "block";
        label.style.margin = "10px 0";
        label.textContent = field.label;
        const input = field.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
        if (field.type !== "textarea") input.type = field.type;
        input.name = field.name;
        input.required = Boolean(field.required);
        input.style.display = "block";
        input.style.width = "100%";
        input.style.boxSizing = "border-box";
        label.appendChild(input);
        form.appendChild(label);
      }

      const honeypot = document.createElement("input");
      honeypot.name = "website";
      honeypot.tabIndex = -1;
      honeypot.autocomplete = "off";
      honeypot.style.cssText = "position:absolute;left:-9999px;";
      form.appendChild(honeypot);

      const button = document.createElement("button");
      button.type = "submit";
      button.textContent = config.button_text;
      form.appendChild(button);

      const status = document.createElement("p");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const response = await fetch(`${apiBase}/api/submissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ widget_id: widgetId, data, honeypot: data.website || "" })
        });
        if (response.ok) {
          form.reset();
          status.textContent = "Thanks! Your submission was received.";
        } else {
          const body = await response.json().catch(() => ({}));
          status.textContent = body.error || "Submission failed.";
        }
      });

      host.appendChild(form);
      host.appendChild(status);
      document.currentScript.parentNode.insertBefore(host, document.currentScript.nextSibling);
    })
    .catch(err => console.error("Widget load failed", err));
})();
