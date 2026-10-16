#!/usr/bin/env python3
"""One-time, repeatable cleanup for Cornell 7 vocabulary data."""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_PATH = ROOT / "courses" / "8b77ac948ba43d5d084d03e194ce7ecb.json"

# These replace the 46 legacy tips that mixed useful learning advice with timestamp status.
# Every sentence is an adapted teaching example, never represented as a podcast quotation.
LEGACY_LEARNING = {
    "pedestrian": ("Learn the contrast pedestrian ↔ driver, and the collocations pedestrian crossing and pedestrian safety.", "The driver stopped to let a pedestrian cross the road.", "司机停车让一名行人过马路。"),
    "at fault": ("Learn the fixed phrase be at fault for: it assigns responsibility, especially for a mistake or accident.", "The report did not determine who was at fault for the collision.", "报告没有确定谁应对这次碰撞负责。"),
    "follow-up questions": ("Follow up is a verb; follow-up is an adjective or noun. A reporter asks follow-up questions to clarify an answer.", "The students asked follow-up questions after the president's statement.", "校长发表声明后，学生们提出了后续问题。"),
    "recession": ("Connect recession with recede, meaning move back. In economics, activity recedes during a recession.", "The speaker compared the quiet crowd to a business district during a recession.", "说话者把安静的人群比作经济衰退时期的商业区。"),
    "reverse": ("Useful driving patterns: reverse into a space, reverse out of a space, and put the car in reverse.", "The driver began to reverse out of the parking space.", "司机开始倒车驶出停车位。"),
    "allegedly": ("A key news and legal word: allegedly means claimed but not yet proved, so it differs from a statement of fact.", "The student allegedly ignored the officer's instructions.", "据称，这名学生没有听从工作人员的指示。"),
    "fiasco": ("A fiasco is not just a problem; it is an embarrassing, chaotic failure. Common phrase: the whole thing was a fiasco.", "A minor parking dispute turned into a public-relations fiasco.", "一场小小的停车纠纷演变成了公关闹剧。"),
    "prestigious": ("From prestige, meaning reputation. Common partners include prestigious university, award, journal, and position.", "She studied at a prestigious university in the United States.", "她就读于美国一所享有盛誉的大学。"),
    "ivy league": ("Ivy League is a fixed proper name for eight US universities; figuratively, it can suggest academic prestige.", "The story takes place at an Ivy League university.", "这个故事发生在一所常春藤盟校。"),
    "loitering": ("Loiter means remain in a public place without a clear purpose. Remember the common notice: No loitering.", "A group of people were loitering near the entrance.", "一群人在入口附近逗留。"),
    "rescinding": ("Rescind is formal and means officially take back. Common objects: rescind an offer, policy, visa, or decision.", "The university considered rescinding its earlier decision.", "学校考虑撤销先前的决定。"),
    "footage": ("Footage is uncountable: say some security footage or a piece of footage, not a footage.", "Security footage showed part of the parking-lot incident.", "监控录像显示了停车场事件的一部分。"),
    "volatile": ("Volatile describes something likely to change or erupt suddenly: a volatile situation, market, or substance.", "The discussion became volatile when the two accounts conflicted.", "当两种说法发生冲突时，讨论变得容易失控。"),
    "accosted": ("Accost is stronger than approach: it suggests confronting someone boldly or aggressively.", "The statement claimed that the student had accosted a passerby.", "声明称这名学生曾上前纠缠一位路人。"),
    "maneuver": ("Use maneuver for careful movement in limited space: maneuver a car into or out of a parking spot.", "She maneuvered the car around the people standing behind it.", "她小心地把车绕过站在后面的人。"),
    "intimidation": ("Intimidate is the verb; intimidation is pressure intended to frighten. Contrast it with persuasion, which uses reasons.", "The students said the warning felt like intimidation.", "学生们说这项警告让人感到受到了恐吓。"),
    "hazardous": ("Hazard is the noun and hazardous the adjective. Common combinations: hazardous conditions, materials, and behavior.", "Reversing through a crowd can create a hazardous situation.", "在人群中倒车可能造成危险局面。"),
    "civil lawsuit": ("Contrast a civil lawsuit, usually seeking a remedy or damages, with a criminal prosecution brought by the state.", "The allegations were presented in a civil lawsuit rather than a criminal verdict.", "这些指控出现在民事诉讼中，而不是刑事判决中。"),
    "fraternity": ("Link fraternity with fraternal and brother. In US campus life, it usually means a male student social organization.", "The university reviewed its relationship with the fraternity.", "学校审查了其与该兄弟会的关系。"),
    "traumatized": ("Trauma is the event or injury; traumatized describes a person deeply affected by it; traumatic describes the experience.", "The lawsuit said the experience left the student traumatized.", "诉讼称这段经历给该学生造成了心理创伤。"),
    "accused": ("The accused means a person alleged to have done wrong; it does not mean guilt has been proved.", "The accused students denied the allegations against them.", "被指控的学生否认了针对他们的指控。"),
    "prosecutor": ("Remember the word family: prosecute → prosecution → prosecutor. A prosecutor brings a criminal case.", "The prosecutor must decide whether the evidence supports a charge.", "检察官必须决定证据是否足以支持指控。"),
    "doxed": ("Dox means publish someone's private identifying information online; doxxing is also commonly spelled with two x's.", "The student said she was doxed after the story spread online.", "这名学生说，事件在网上传播后，她的私人信息被公开。"),
    "coercion": ("From coerce, meaning force. Contrast coercion with persuasion: coercion relies on threats or pressure.", "Consent obtained through coercion is not freely given.", "通过胁迫获得的同意并非出于自愿。"),
    "adjudicated": ("Adjudicate is a formal legal verb meaning decide a dispute; adjudication is the decision-making process.", "The allegation had not yet been adjudicated by a court.", "这项指控尚未经法院裁定。"),
    "credibility": ("Credible means believable; credibility is the quality of being believed. Common phrase: assess a witness's credibility.", "The report compared the credibility of the competing accounts.", "报告比较了不同说法的可信度。"),
    "speculations": ("Speculate is the verb and speculation the usually uncountable noun. Use it when evidence is incomplete.", "The host separated confirmed details from speculation.", "主持人把已确认的细节与推测区分开来。"),
    "polarizing": ("Picture two poles pulling apart: a polarizing issue divides people into strongly opposed groups.", "The case became a polarizing topic on campus.", "这起案件成了校园里一个引发两极分化的话题。"),
    "sororities": ("Link sorority with Latin soror, sister. Sororities is the plural; fraternity is the related male organization.", "Several fraternities and sororities operate near the campus.", "校园附近有多个兄弟会和女生联谊会。"),
    "hazing": ("Hazing means harmful or humiliating initiation activity. Learn the common combinations anti-hazing policy and hazing allegation.", "The university prohibits hazing during student-group initiation.", "学校禁止学生团体在入会仪式中实施霸凌。"),
    "plaintiffs": ("In a civil case, plaintiffs bring the claim and defendants respond to it. Learn the pair together.", "The plaintiffs sought damages from several defendants.", "原告向多名被告索赔。"),
    "intoxicated": ("Intoxicated is a formal term for being affected by alcohol or drugs; intoxication is the noun.", "The filing alleged that several people were intoxicated that night.", "诉状称当晚有几个人处于醉酒状态。"),
    "incentive": ("An incentive is something that motivates action. Common combinations: financial incentive and incentive to do something.", "The housing arrangement gave the university a financial incentive to maintain the system.", "这种住宿安排给学校带来了维持该体系的经济动机。"),
    "alumni": ("Alumni is plural. Alumnus and alumna are traditional singular forms; alum is a common gender-neutral alternative.", "Many alumni continued to support the university financially.", "许多校友继续在经济上支持学校。"),
    "pledge": ("In fraternity context, a pledge is a prospective member. In other contexts, pledge means a serious promise.", "The former member described what happened when he was a pledge.", "这名前成员讲述了自己还是准会员时发生的事情。"),
    "psychological": ("Build the family: psychology → psychological → psychologically. Common phrase: psychological pressure.", "The account described both physical and psychological pressure.", "该说法描述了身体和心理两方面的压力。"),
    "undergraduate": ("Under- plus graduate: an undergraduate is studying for a first degree; a postgraduate studies after that degree.", "He joined the organization while he was an undergraduate.", "他在读本科时加入了这个组织。"),
    "consenting": ("Consent must be free and informed. Consenting describes someone who agrees voluntarily, without coercion.", "The filing disputed whether everyone involved was a consenting participant.", "诉状对所有参与者是否都自愿同意提出了质疑。"),
    "defendant": ("Link defendant with defend. In a civil case, learn defendant as the opposite of plaintiff.", "Each defendant filed a response to the lawsuit.", "每名被告都对这起诉讼提交了答辩。"),
    "recollection": ("Recollect means remember; recollection is a memory. Useful pattern: have no recollection of an event.", "Her recollection of the conversation differed from his.", "她对那次谈话的回忆与他不同。"),
    "misconduct": ("Mis- means wrong or bad, so misconduct is improper conduct. Common combinations: alleged, professional, or academic misconduct.", "The investigation examined allegations of student misconduct.", "调查审查了有关学生不当行为的指控。"),
    "interim": ("Interim means temporary between two permanent stages: interim president, report, measure, or agreement.", "An interim president led the university during the investigation.", "调查期间，一名临时校长负责管理学校。"),
    "discrimination": ("Build the word family: discriminate → discriminatory → discrimination. Common phrase: discrimination based on race or sex.", "The complaint included an allegation of discrimination.", "投诉中包含一项歧视指控。"),
    "subpoena": ("A subpoena is a legal order, not a request. Common verbs are issue, receive, comply with, and challenge a subpoena.", "The committee issued a subpoena for the relevant records.", "委员会发出传票，要求提交相关记录。"),
    "sanctions": ("Sanctions are formal penalties. Learn impose sanctions on and face sanctions for; context may be academic or international.", "Students who violate the policy may face disciplinary sanctions.", "违反该政策的学生可能面临纪律处分。"),
    "egregious": ("Egregious is stronger than bad: it means shockingly unacceptable. Common partners include misconduct, error, and violation.", "The complaint characterized the alleged conduct as egregious.", "投诉把所指控的行为描述为极其恶劣。"),
}

IPA_OVERRIDES = {
    "doxed": "/dɑkst/",
    "anti-climactically": "/ˌæntiˌklaɪˈmæktɪkli/",
    "anticlimactically": "/ˌæntiˌklaɪˈmæktɪkli/",
    "third-party vendor": "/ˌθɝd ˈpɑrti ˈvɛndər/",
    "self-insuring": "/ˌsɛlf ɪnˈʃʊrɪŋ/",
    "redaction": "/rɪˈdækʃən/",
    "redactions": "/rɪˈdækʃənz/",
    "cross-referencing": "/ˌkrɔsˈrɛfərənsɪŋ/",
}


def normalize(value: object) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).strip().lower()
    return re.sub(r"\s+", " ", text.translate(str.maketrans({"‘": "'", "’": "'", "‐": "-", "‑": "-", "–": "-", "—": "-"})))


def seconds(value: str) -> int:
    minutes, secs = value.split(":")
    return int(minutes) * 60 + int(secs)


def unit_for(course: dict, item: dict) -> int:
    if isinstance(item.get("unit"), int):
        return item["unit"]
    time = seconds(item["time"])
    return next(index for index, unit in enumerate(course["units"]) if seconds(unit["start"]) <= time < seconds(unit["end"]))


def merge_missing(kept: dict, duplicate: dict) -> None:
    for key, value in duplicate.items():
        if key not in kept or kept[key] in (None, "", []):
            kept[key] = value
    if duplicate.get("id") and kept.get("id") and duplicate["id"] != kept["id"]:
        kept.setdefault("legacy_ids", []).append(duplicate["id"])


def main() -> None:
    course = json.loads(COURSE_PATH.read_text(encoding="utf-8"))
    for item in course["vocab"][:46]:
        tip, example, example_cn = LEGACY_LEARNING[normalize(item["word"])]
        item.update(tip=tip, example=example, example_cn=example_cn, example_source="adapted")

    kept_by_key: dict[tuple[int, str], dict] = {}
    merged: list[dict] = []
    removed = 0
    for item in course["vocab"]:
        key = (unit_for(course, item), normalize(item["word"]))
        if key in kept_by_key:
            merge_missing(kept_by_key[key], item)
            removed += 1
        else:
            kept_by_key[key] = item
            merged.append(item)
    course["vocab"] = merged

    # Optional local helper used only to materialize IPA into JSON; it is not a runtime dependency.
    try:
        import eng_to_ipa as ipa
    except ImportError:
        ipa = None
    if ipa:
        for item in course["vocab"]:
            normalized = normalize(item["word"])
            if normalized in IPA_OVERRIDES:
                item["ipa"] = IPA_OVERRIDES[normalized]
                continue
            value = ipa.convert(item["word"], retrieve_all=False, keep_punct=False).strip()
            if value and "*" not in value:
                item["ipa"] = f"/{value}/"

    course["meta"]["revision"] = "2026-10-17-vocabulary-cleanup"
    course["meta"]["examples"] = "Teaching examples may be adapted for clarity; only records with a verified clip are treated as podcast quotations."
    COURSE_PATH.write_text(json.dumps(course, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated Cornell 7: {len(merged)} vocabulary records; merged {removed} duplicate rows; rewrote {len(LEGACY_LEARNING)} learning records.")


if __name__ == "__main__":
    main()
