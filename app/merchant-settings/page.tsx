'use client';

import React, { useState, useEffect } from 'react';

// Define a type for the settings, matching your Prisma model
interface MerchantSettings {
  id: string;
  inventoryThreshold: number;
  maxPrice: number;
  reviewFrequency: number; // This will now be 1, 2, 3, or 4
  aiBehaviourPrompt: string | null;
}

export default function MerchantSettingsPage() {
  const [settings, setSettings] = useState<MerchantSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // State for form inputs
  const [inventoryThreshold, setInventoryThreshold] = useState<number>(10);
  const [maxPrice, setMaxPrice] = useState<number>(500);
  const [reviewFrequency, setReviewFrequency] = useState<number>(2); // Default to Daily (2)
  const [aiBehaviourPrompt, setAiBehaviourPrompt] = useState<string>('');

  // Mapping for display
  const frequencyOptions = [
    { value: 1, label: 'Hourly' },
    { value: 2, label: 'Daily' },
    { value: 3, label: 'Weekly' },
    { value: 4, label: 'Monthly' },
  ];

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/merchant-settings');
        if (!response.ok) {
          if (response.status === 404) {
            setSettings(null); // No settings exist yet, keep default form values
          } else {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to fetch settings');
          }
        } else {
          const data: MerchantSettings = await response.json();
          setSettings(data);
          // Populate form fields with fetched data
          setInventoryThreshold(data.inventoryThreshold);
          setMaxPrice(data.maxPrice);
          // Ensure reviewFrequency is one of the valid options, default if not
          setReviewFrequency(frequencyOptions.some(opt => opt.value === data.reviewFrequency) ? data.reviewFrequency : 2);
          setAiBehaviourPrompt(data.aiBehaviourPrompt || '');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = {
      inventoryThreshold,
      maxPrice,
      reviewFrequency,
      aiBehaviourPrompt: aiBehaviourPrompt || null,
    };

    try {
      let response;
      if (settings) {
        // If settings exist, update them (PUT)
        response = await fetch('/api/merchant-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // If no settings exist, create them (POST)
        response = await fetch('/api/merchant-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save settings');
      }

      const updatedData: MerchantSettings = await response.json();
      setSettings(updatedData);
      setSuccess('Settings saved successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Merchant Settings</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Success:</strong>
            <span className="block sm:inline"> {success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="inventoryThreshold" className="block text-sm font-medium text-gray-700">
              Inventory Threshold
            </label>
            <input
              type="number"
              id="inventoryThreshold"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={inventoryThreshold}
              onChange={(e) => setInventoryThreshold(parseInt(e.target.value))}
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              AI will consider price adjustments when inventory drops below this level.
            </p>
          </div>

          <div>
            <label htmlFor="maxPrice" className="block text-sm font-medium text-gray-700">
              Maximum Price
            </label>
            <input
              type="number"
              id="maxPrice"
              step="0.01"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={maxPrice}
              onChange={(e) => setMaxPrice(parseFloat(e.target.value))}
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              The highest price the AI is allowed to set for a product.
            </p>
          </div>

          <div>
            <label htmlFor="reviewFrequency" className="block text-sm font-medium text-gray-700">
              Review Frequency
            </label>
            <select
              id="reviewFrequency"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={reviewFrequency}
              onChange={(e) => setReviewFrequency(parseInt(e.target.value))}
              required
            >
              {frequencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-500">
              How often the AI should review and potentially adjust product prices.
            </p>
          </div>

          <div>
            <label htmlFor="aiBehaviourPrompt" className="block text-sm font-medium text-gray-700">
              AI Behaviour Prompt
            </label>
            <textarea
              id="aiBehaviourPrompt"
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={aiBehaviourPrompt}
              onChange={(e) => setAiBehaviourPrompt(e.target.value)}
            ></textarea>
            <p className="mt-2 text-sm text-gray-500">
              Instructions or guidelines for the AI's pricing strategy.
            </p>
          </div>

          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
