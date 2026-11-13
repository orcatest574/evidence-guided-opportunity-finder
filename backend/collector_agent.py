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


INSTRUCTIONS = """You are a helpful web search assistent."""

collector_agent = Agent(
    name="Blue sience park",
    instructions=INSTRUCTIONS,
    model=model,
    tools=[web_search],
)


def main():
    with open("profiles/roxtec.json", "r") as f:
        profile = json.load(f)
    result = Runner.run_sync(
            collector_agent,
            input=f"Given the following profile, what are the top 3 opportunities for this company?\n\n{json.dumps(profile, indent=2)}",
            max_turns=10,
        )

    print("AI:", result.final_output)


if __name__ == "__main__":
    main()