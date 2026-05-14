"""
One-shot script to seed teams and players into the database.
Run from backend/: python seed_players.py
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models import Team, Player, GenderEnum

DATABASE_URL = "postgresql+asyncpg://postgres:postgres@db:5432/superselector"

PLAYERS = [
    # (player_name, team, gender, bid_points, is_captain)
    ("Venkatesh P", "Assetz Challengers", "M", 0, True),
    ("Harpreet Singh", "Assetz Challengers", "M", 11000, False),
    ("Nandha", "Assetz Challengers", "M", 10000, False),
    ("Aniketh J", "Assetz Challengers", "M", 22000, False),
    ("Nikhil Scaria", "Assetz Challengers", "M", 5000, False),
    ("Jyotirmay P", "Assetz Challengers", "M", 4000, False),
    ("Neel Kamal", "Assetz Challengers", "M", 7000, False),
    ("Saket", "Assetz Challengers", "M", 5000, False),
    ("Anumeha D", "Assetz Challengers", "F", 19000, False),
    ("Mayukh Nandi", "Assetz Challengers", "M", 13000, False),
    ("Lakshmi S", "Assetz Challengers", "F", 1000, False),
    ("Varun K", "Assetz Endless Rally", "M", 0, True),
    ("Aishwarya", "Assetz Endless Rally", "F", 38000, False),
    ("Deepak R", "Assetz Endless Rally", "M", 10000, False),
    ("Ashutosh Tiwari", "Assetz Endless Rally", "M", 1000, False),
    ("Praveen Hadimani", "Assetz Endless Rally", "M", 14000, False),
    ("Vishveshwar P", "Assetz Endless Rally", "M", 6000, False),
    ("Aman Agrawal", "Assetz Endless Rally", "M", 4000, False),
    ("Ajeet Malviya", "Assetz Endless Rally", "M", 6000, False),
    ("Ashish Srivastav", "Assetz Endless Rally", "M", 5000, False),
    ("Divya Nambiar", "Assetz Endless Rally", "F", 6000, False),
    ("Dibya Ranjan", "Assetz Endless Rally", "M", 5000, False),
    ("Subbiah P", "Backhand Brigade", "M", 0, True),
    ("Reema Das", "Backhand Brigade", "F", 11000, False),
    ("Keerthana M", "Backhand Brigade", "F", 10000, False),
    ("Ashutosh Gupta", "Backhand Brigade", "M", 11000, False),
    ("Rahul Gupta", "Backhand Brigade", "M", 22000, False),
    ("Sai Kiran", "Backhand Brigade", "M", 19000, False),
    ("Suprit Mitra", "Backhand Brigade", "M", 2000, False),
    ("Bharat Pai", "Backhand Brigade", "M", 2000, False),
    ("Saurav", "Backhand Brigade", "M", 10000, False),
    ("Vishwa Prakash", "Backhand Brigade", "M", 2000, False),
    ("Mathews Paul", "Backhand Brigade", "M", 4000, False),
    ("Prathap M", "Big Dawgs", "M", 0, True),
    ("Prashant Dey", "Big Dawgs", "M", 18000, False),
    ("Sandeep Myla", "Big Dawgs", "M", 18000, False),
    ("Nagabushan", "Big Dawgs", "M", 26000, False),
    ("Sanjay H T", "Big Dawgs", "M", 6000, False),
    ("Sourav Das", "Big Dawgs", "M", 7000, False),
    ("Harsitha Verma", "Big Dawgs", "F", 1000, False),
    ("Udham Singh", "Big Dawgs", "M", 11000, False),
    ("Krishnendu Roy", "Big Dawgs", "M", 5000, False),
    ("Anshupriya M", "Big Dawgs", "F", 1000, False),
    ("Jatin Aneja", "Big Dawgs", "M", 6000, False),
    ("Anand Shenoy", "Club Shakti", "M", 0, True),
    ("Vikas Soni", "Club Shakti", "M", 15000, False),
    ("Fatema K", "Club Shakti", "F", 24000, False),
    ("Vivek D K", "Club Shakti", "M", 3000, False),
    ("Gautham Santosh", "Club Shakti", "M", 15000, False),
    ("Tushar Srivastava", "Club Shakti", "M", 36000, False),
    ("Deepak Nailwal", "Club Shakti", "M", 1000, False),
    ("Swati N", "Club Shakti", "F", 3000, False),
    ("Vikas Mewara", "Club Shakti", "M", 1000, False),
    ("Shobhit Sharma", "Club Shakti", "M", 1000, False),
    ("Sanisetti K", "Club Shakti", "M", 1000, False),
    ("Arya Menon", "Court Commanders", "M", 0, True),
    ("Satya Singh", "Court Commanders", "M", 5000, False),
    ("Yagnya", "Court Commanders", "M", 32000, False),
    ("Harish Verma", "Court Commanders", "M", 15000, False),
    ("Bighneswar S", "Court Commanders", "M", 6000, False),
    ("Pankaj Arora", "Court Commanders", "M", 5000, False),
    ("Bharath Raj", "Court Commanders", "M", 3000, False),
    ("Rashi Patni", "Court Commanders", "F", 6000, False),
    ("Subrat", "Court Commanders", "M", 9000, False),
    ("Rohit Jain", "Court Commanders", "M", 15000, False),
    ("Amrita Pathak", "Court Commanders", "F", 4000, False),
    ("Vaishali Jain", "Dhurandhar Smash Squad", "F", 0, True),
    ("Priyanka", "Dhurandhar Smash Squad", "F", 1000, False),
    ("Gourav Zutsi", "Dhurandhar Smash Squad", "M", 3000, False),
    ("Sudhanshu Singh", "Dhurandhar Smash Squad", "M", 13000, False),
    ("Subhradeep Majumdar", "Dhurandhar Smash Squad", "M", 28000, False),
    ("Sandeep Chaudhary", "Dhurandhar Smash Squad", "M", 28000, False),
    ("Rajiv Ranjan", "Dhurandhar Smash Squad", "M", 6000, False),
    ("Md Fahim", "Dhurandhar Smash Squad", "M", 16000, False),
    ("Shantanu Pareek", "Dhurandhar Smash Squad", "M", 3000, False),
    ("Kanmaljit N", "Dhurandhar Smash Squad", "M", 1000, False),
    ("Varun B", "Dhurandhar Smash Squad", "M", 1000, False),
    ("Sharon M", "Mavericks 63", "M", 0, True),
    ("Adwait Sharma", "Mavericks 63", "M", 12000, False),
    ("Praveen Singh W", "Mavericks 63", "M", 38000, False),
    ("Vandana A", "Mavericks 63", "F", 7000, False),
    ("Shikhar Mishra", "Mavericks 63", "M", 8000, False),
    ("Khushboo", "Mavericks 63", "F", 18000, False),
    ("Dhanu Pandey", "Mavericks 63", "M", 8000, False),
    ("Hari Sriramulu", "Mavericks 63", "M", 5000, False),
    ("Venkata Subrahmanyam", "Mavericks 63", "M", 1000, False),
    ("Kallola M P", "Mavericks 63", "M", 1000, False),
    ("Subhendu R", "Mavericks 63", "M", 2000, False),
    ("Ankit Purohit", "Netflicks & Kill", "M", 0, True),
    ("Hariharan T", "Netflicks & Kill", "M", 12000, False),
    ("Samina", "Netflicks & Kill", "F", 19000, False),
    ("Nikhil Ranjan", "Netflicks & Kill", "M", 7000, False),
    ("Arun Tayyil", "Netflicks & Kill", "M", 9000, False),
    ("Abhishek Kumar", "Netflicks & Kill", "M", 13000, False),
    ("Harrish Mathew", "Netflicks & Kill", "M", 11000, False),
    ("Praseeth A", "Netflicks & Kill", "M", 12000, False),
    ("Pinto Deepak", "Netflicks & Kill", "M", 11000, False),
    ("Bikas Tripathy", "Netflicks & Kill", "M", 3000, False),
    ("Bhagyashri S", "Netflicks & Kill", "F", 1000, False),
    ("Rajeev", "Shuttle Strikers", "M", 0, True),
    ("Ratheesh J", "Shuttle Strikers", "M", 24000, False),
    ("Risun Antony", "Shuttle Strikers", "M", 18000, False),
    ("Manjula Patil", "Shuttle Strikers", "F", 36000, False),
    ("Dheeren Mohta", "Shuttle Strikers", "M", 5000, False),
    ("Viswa M", "Shuttle Strikers", "M", 3000, False),
    ("Pradeep Rawat", "Shuttle Strikers", "M", 5000, False),
    ("Babloo Kumar", "Shuttle Strikers", "M", 3000, False),
    ("Munish Kumar", "Shuttle Strikers", "M", 1000, False),
    ("Kaustav G", "Shuttle Strikers", "M", 1000, False),
    ("Saumya Sharma", "Shuttle Strikers", "F", 1000, False),
    ("Prankur T", "Smash Syndicate", "M", 0, True),
    ("Aahad Sheffi", "Smash Syndicate", "M", 40000, False),
    ("Pankajananda D", "Smash Syndicate", "M", 20000, False),
    ("Raksha Singh", "Smash Syndicate", "F", 14000, False),
    ("Devansh Sharma", "Smash Syndicate", "M", 1000, False),
    ("Nishant Dwivedi", "Smash Syndicate", "M", 2000, False),
    ("Vinay", "Smash Syndicate", "M", 10000, False),
    ("Shanteri S", "Smash Syndicate", "F", 6000, False),
    ("Atin Kumar Jain", "Smash Syndicate", "M", 3000, False),
    ("Milan Ankola", "Smash Syndicate", "M", 3000, False),
    ("Rajarshi C", "Smash Syndicate", "M", 1000, False),
    ("Gaurav K", "Supersonic", "M", 0, True),
    ("Kalpesh C", "Supersonic", "M", 19000, False),
    ("Haris K A", "Supersonic", "M", 5000, False),
    ("Amrith Vikram", "Supersonic", "M", 16000, False),
    ("Ankesh Mishra", "Supersonic", "M", 18000, False),
    ("Anjani Kunwar", "Supersonic", "M", 5000, False),
    ("Nisha Shrivansh", "Supersonic", "F", 8000, False),
    ("Ekta Jain", "Supersonic", "F", 17000, False),
    ("Deep Verma", "Supersonic", "M", 8000, False),
    ("Abhinav Sisodia", "Supersonic", "M", 2000, False),
    ("Ragin G", "Supersonic", "M", 1000, False),
]


async def seed():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Collect unique team names
        team_names = sorted({row[1] for row in PLAYERS})

        # Upsert teams: insert if not exists
        team_map = {}
        for name in team_names:
            result = await session.execute(select(Team).where(Team.name == name))
            team = result.scalar_one_or_none()
            if not team:
                team = Team(name=name)
                session.add(team)
                await session.flush()
                print(f"  + Team: {name}")
            else:
                print(f"  ~ Team exists: {name}")
            team_map[name] = team

        # Insert players (skip if name+team already exists)
        inserted = 0
        skipped = 0
        for player_name, team_name, gender, bid_points, is_captain in PLAYERS:
            team = team_map[team_name]
            result = await session.execute(
                select(Player).where(Player.name == player_name, Player.team_id == team.id)
            )
            if result.scalar_one_or_none():
                skipped += 1
                continue
            gender_enum = GenderEnum.MALE if gender == "M" else GenderEnum.FEMALE
            player = Player(
                name=player_name,
                team_id=team.id,
                gender=gender_enum,
                bid_points=bid_points,
                is_real_captain=is_captain,
            )
            session.add(player)
            inserted += 1

        await session.commit()
        print(f"\nDone. Players inserted: {inserted}, skipped (already exist): {skipped}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
