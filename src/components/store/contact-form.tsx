"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function ContactForm({ whatsappNumber }: { whatsappNumber: string }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError("Enter your name so the owner knows who is writing.");
      return;
    }
    if (message.trim().length < 5) {
      setError("Add a short message about what you would like to know.");
      return;
    }

    try {
      const url = buildWhatsAppUrl(
        whatsappNumber,
        `Hello SHS Collective, I'm ${name.trim()}.\n\n${message.trim()}`,
      );
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("WhatsApp is not configured right now. Please try again later.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="contact-name">Your name</Label>
        <Input
          id="contact-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          autoComplete="name"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
          maxLength={1000}
          placeholder="Which piece are you asking about? Include size or colour if relevant."
          required
        />
      </div>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full sm:w-auto">
        <MessageCircle aria-hidden="true" />
        Open in WhatsApp
      </Button>
      <p className="text-[0.66rem] leading-relaxed text-muted">
        This does not send a message from the website. It opens WhatsApp with your text ready to send.
      </p>
    </form>
  );
}
