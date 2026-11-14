import json
import os

from dotenv import load_dotenv
from openai import AsyncOpenAI
from agents import Agent, Runner, OpenAIChatCompletionsModel, function_tool, set_tracing_disabled
from tools import web_search
load_dotenv()

# No traces to OpenAIs servers, to avoid data aggregation
set_tracing_disabled(True)

client = AsyncOpenAI(
    base_url=os.environ["AI_URL"],
    api_key=os.environ["API_KEY"],
)
model = OpenAIChatCompletionsModel(model=os.environ["MODEL_NAME"], openai_client=client)


INSTRUCTIONS = """You are a web-search agent. Input: a single company name (company_name).
Search public sources for events, funding calls and testing opportunities specifically
relevant to that company. Return ONLY valid JSON (no explanatory text) matching this shape:

{ "company_name": "<the same company_name input>", "events": [
    {
      "title": "string",
      "date": "YYYY-MM-DD" | null,
      "location": "string" | null,
      "description": "string | null (max 300 chars)",
      "url": "https://..." | null
    } ]
}

Requirements:
- Use the web_search tool at most 3 times, then stop searching and give your final answer.
- Return up to 5 items, most relevant first.
- Use ISO dates (YYYY-MM-DD) when available; otherwise set date: null.
- If a field is unavailable, set it to null (do not omit keys).
- Ensure url is an absolute https:// or http:// link; otherwise null.
- Keep description concise (<=300 chars). Strip HTML.
- If no matching events found, return "events": [].
- On errors, still respond with valid JSON and an empty events array.
- Do not include any plain-text commentary or extra fields, only the exact JSON above.

Example response:
{ "company_name":"Roxtec", "events":[
    {
      "title":"EMC Testing Workshop - Nordic Testbeds 2026",
      "date":"2026-05-12",
      "location":"Gothenburg, Sweden",
      "description":"Hands-on EMC testing for industrial communications and cable shielding.",
      "url":"https://example.org/emc-workshop-2026"
    },
    { "title":"Regional Research Funding Call: Critical Infrastructure Testing",
      "date":null, "location":null,
      "description":"A funding call for testbed access and certification studies.",
      "url":"https://example.org/funding-call" } ]
}"""


collector_agent = Agent(
    name="Blue sience park",
    instructions=INSTRUCTIONS,
    model=model,
    tools=[web_search],
)


def main():
    with open("../src/data/companies/roxtec.json", "r") as f:
        profile = json.load(f)
    result = Runner.run_sync(
            collector_agent,
            input=f"Given the following profile, what are the top 3 opportunities for this company?\n\n{json.dumps(profile, indent=2)}",
            max_turns=10,
        )

    print("AI:", result.final_output)


if __name__ == "__main__":
    main()