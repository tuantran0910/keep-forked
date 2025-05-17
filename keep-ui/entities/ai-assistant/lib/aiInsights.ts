import { sendChatMessage } from '../api/client';

export interface InsightOptions {
  maxLength?: number;
  includeActionItems?: boolean;
  modelName?: string;
}

export interface AlertInsight {
  summary: string;
  possibleCauses: string[];
  recommendedActions: string[];
  relatedServices?: string[];
  priority?: string;
}

export interface IncidentInsight {
  summary: string;
  status: string;
  timeline?: string;
  nextSteps: string[];
  estimatedImpact: string;
}

interface Alert {
  id: string;
  name: string;
  description?: string;
  severity?: string;
  source?: string;
  status?: string;
  related_services?: string[];
}

interface Incident {
  id: string;
  name: string;
  description?: string;
  status?: string;
  severity?: string;
  created_at?: string;
  updates?: Array<{time: string; message: string}>;
  affected_services?: string[];
}

// Extended context type for AI requests
interface AIRequestContext {
  systemRole?: string;
  modelName?: string;
  returnFormat?: string;
  [key: string]: any;
}

/**
 * Generate insights for an alert using the AI Assistant
 */
export async function generateAlertInsights(
  alert: Alert,
  options: InsightOptions = {}
): Promise<AlertInsight> {
  const defaultOptions = {
    maxLength: 250,
    includeActionItems: true,
    modelName: 'default',
  };

  const mergedOptions = { ...defaultOptions, ...options };

  try {
    // Create a prompt for the AI to analyze the alert
    const prompt = `
    I need insights about this alert:
    Name: ${alert.name}
    Description: ${alert.description || 'N/A'}
    Severity: ${alert.severity || 'N/A'}
    Source: ${alert.source || 'N/A'}
    Status: ${alert.status || 'N/A'}

    Please analyze this alert and provide:
    1. A brief summary (max ${mergedOptions.maxLength} chars)
    2. Possible causes
    3. Recommended actions
    ${alert.related_services ? `4. Which services might be affected: ${alert.related_services.join(', ')}` : ''}

    Format as JSON with keys: summary, possibleCauses (array), recommendedActions (array), relatedServices (array)
    `;

    // Send request to AI Assistant
    const response = await sendChatMessage(
      prompt,
      undefined,
      {
        systemRole: 'analyst',
        modelName: mergedOptions.modelName,
        returnFormat: 'json'
      } as AIRequestContext
    );

    if (response.error) {
      throw new Error(response.error);
    }

    // Parse the response which should be JSON
    try {
      const content = response.message || '';
      // Extract JSON from message if needed
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                       content.match(/```([\s\S]*?)```/) ||
                       [null, content];

      const jsonData = JSON.parse(jsonMatch[1] || content);

      return {
        summary: jsonData.summary || 'No summary available',
        possibleCauses: jsonData.possibleCauses || [],
        recommendedActions: jsonData.recommendedActions || [],
        relatedServices: jsonData.relatedServices,
        priority: jsonData.priority,
      };
    } catch (err) {
      console.error('Failed to parse AI response:', err);
      return {
        summary: 'Failed to analyze alert',
        possibleCauses: [],
        recommendedActions: ['Check alert details manually'],
      };
    }
  } catch (error) {
    console.error('Error generating alert insights:', error);
    return {
      summary: 'Error analyzing alert',
      possibleCauses: [],
      recommendedActions: ['Try again later or check alert details manually'],
    };
  }
}

/**
 * Generate insights for an incident using the AI Assistant
 */
export async function generateIncidentInsights(
  incident: Incident,
  options: InsightOptions = {}
): Promise<IncidentInsight> {
  const defaultOptions = {
    maxLength: 300,
    includeActionItems: true,
    modelName: 'default',
  };

  const mergedOptions = { ...defaultOptions, ...options };

  try {
    // Create updates info if available
    const updatesText = incident.updates?.length ? `Recent updates:
        ${incident.updates.map(u => `- ${new Date(u.time).toLocaleString()}: ${u.message}`).join('\n        ')}`
      : '';

    // Create a prompt for the AI to analyze the incident
    const prompt = `
    I need insights about this incident:
    Name: ${incident.name}
    Description: ${incident.description || 'N/A'}
    Status: ${incident.status || 'N/A'}
    Severity: ${incident.severity || 'N/A'}
    Created: ${incident.created_at ? new Date(incident.created_at).toLocaleString() : 'N/A'}
    ${updatesText}

    Please analyze this incident and provide:
    1. A brief summary (max ${mergedOptions.maxLength} chars)
    2. Current status analysis
    3. Next steps to resolve
    4. Estimated impact
    ${incident.affected_services?.length ? `5. Affected services: ${incident.affected_services.join(', ')}` : ''}

    Format as JSON with keys: summary, status, nextSteps (array), estimatedImpact
    `;

    // Send request to AI Assistant
    const response = await sendChatMessage(
      prompt,
      undefined,
      {
        systemRole: 'incident_manager',
        modelName: mergedOptions.modelName,
        returnFormat: 'json'
      } as AIRequestContext
    );

    if (response.error) {
      throw new Error(response.error);
    }

    // Parse the response which should be JSON
    try {
      const content = response.message || '';
      // Extract JSON from message if needed
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                       content.match(/```([\s\S]*?)```/) ||
                       [null, content];

      const jsonData = JSON.parse(jsonMatch[1] || content);

      return {
        summary: jsonData.summary || 'No summary available',
        status: jsonData.status || 'Status unknown',
        nextSteps: jsonData.nextSteps || [],
        timeline: jsonData.timeline,
        estimatedImpact: jsonData.estimatedImpact || 'Impact unknown',
      };
    } catch (err) {
      console.error('Failed to parse AI response:', err);
      return {
        summary: 'Failed to analyze incident',
        status: 'Parse error',
        nextSteps: ['Check incident details manually'],
        estimatedImpact: 'Unknown',
      };
    }
  } catch (error) {
    console.error('Error generating incident insights:', error);
    return {
      summary: 'Error analyzing incident',
      status: 'API error',
      nextSteps: ['Try again later or check incident details manually'],
      estimatedImpact: 'Unknown',
    };
  }
}
