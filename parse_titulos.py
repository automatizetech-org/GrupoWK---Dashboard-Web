# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""
Parse os PDFs de titulos vencidos e exporta a estrutura hierarquica por cliente.

O arquivo JSON (padrao) agrupa as linhas por cliente de forma que os dados do
cliente aparecam apenas no nivel do cliente. O CSV continua disponivel para
interfaces que ainda dependem de linhas planas.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from decimal import Decimal
from pathlib import Path
from typing import Iterable, Sequence

import pdfplumber

# Mapeamento de siglas de tipos de cobrança para nomes completos
# Baseado na análise dos PDFs de títulos vencidos
PAYMENT_TYPE_MAPPING = {
    # Bancos
    'BD': 'BANCO BRADESCO',
    'SF': 'BANCO SAFRA',
    'DV': 'BANCO DAYCOVAL',
    'BB': 'BANCO DO BRASIL',
    'IT': 'BANCO ITAU',
    'CE': 'BANCO CEF',
    'CX': 'BANCO CAIXA',
    'NU': 'BANCO NUBANK',
    'IN': 'BANCO INTER',
    'OR': 'BANCO ORIGINAL',
    'PA': 'BANCO PAN',
    'BT': 'BANCO BTG',
    'XP': 'BANCO XP',
    
    # Tipos de pagamento
    'DB': 'DEPOSITO BANCARIO',
    'PX': 'PIX',
    'CH': 'CHEQUE',
    'TR': 'TRANSFERENCIA',
    'BO': 'BOLETO',
    'CC': 'CARTAO DE CREDITO',
    'CD': 'CARTAO DE DEBITO',
    'TE': 'TED',
    'DOC': 'DOC',
}


def expand_payment_type(code: str) -> str:
    """Expande uma sigla de tipo de cobrança para seu nome completo."""
    if not code:
        return ''
    upper_code = code.strip().upper()
    return PAYMENT_TYPE_MAPPING.get(upper_code, code)

ENTRY_PATTERN = re.compile(
    r"""
    ^
    (?P<data_vencimento>\d{2}/\d{2}/\d{4})\s+
    (?P<data_emissao>\d{2}/\d{2}/\d{4})\s+
    (?P<numero_nf>\d+)\s+
    (?P<tipo_cobranca>\S+)\s*-\s+
    (?P<condicao_pagamento>.+?)\s+
    (?P<valor>\d{1,3}(?:\.\d{3})*,\d{2})\s+
    (?P<valor_pago>\d{1,3}(?:\.\d{3})*,\d{2})\s+
    (?P<valor_pendente>\d{1,3}(?:\.\d{3})*,\d{2})\s+
    (?P<dias_vencidos>\d+)
    \s*$
    """,
    re.VERBOSE,
)

CLIENT_PATTERN = re.compile(r"^Cliente:\s*(?P<client_code>\d+)\s*-\s*(?P<client_name>.+)$")

TOTAL_CLIENT_PATTERN = re.compile(
    r"^Total por Cliente\s+"
    r"(?P<valor>\d{1,3}(?:\.\d{3})*,\d{2})\s+"
    r"(?P<valor_pago>\d{1,3}(?:\.\d{3})*,\d{2})\s+"
    r"(?P<valor_pendente>\d{1,3}(?:\.\d{3})*,\d{2})\s*$"
)


def parse_amount(amount: str) -> Decimal:
    normalized = amount.replace(".", "").replace(",", ".")
    return Decimal(normalized)


def parse_pdf(path: Path) -> dict:
    clients: list[dict] = []
    current_client: dict | None = None

    def finalize_client() -> None:
        if not current_client or not current_client["entries"]:
            return
        clients.append(
            {
                "client_code": current_client["client_code"],
                "client_name": current_client["client_name"],
                "entries": current_client["entries"].copy(),
                "totals": current_client["totals"],
                "page_numbers": sorted(current_client["page_numbers"]),
            }
        )

    with pdfplumber.open(path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            text = page.extract_text()
            if not text:
                continue
            for line_num, raw_line in enumerate(text.splitlines(), start=1):
                line = raw_line.strip()
                if not line:
                    continue
                client_match = CLIENT_PATTERN.match(line)
                if client_match:
                    finalize_client()
                    current_client = {
                        "client_code": client_match.group("client_code"),
                        "client_name": client_match.group("client_name").strip(),
                        "entries": [],
                        "totals": None,
                        "page_numbers": set(),
                    }
                    continue
                if line.startswith("Dt.Vencto."):
                    continue
                if line.startswith("Total por"):
                    total_match = TOTAL_CLIENT_PATTERN.match(line)
                    if total_match and current_client:
                        current_client["totals"] = {
                            "valor": total_match.group("valor"),
                            "valor_pago": total_match.group("valor_pago"),
                            "valor_pendente": total_match.group("valor_pendente"),
                        }
                    continue
                if line.startswith("Financeiro"):
                    continue
                if not current_client:
                    continue
                match = ENTRY_PATTERN.match(line)
                if not match:
                    continue
                payload = match.groupdict()
                cond_raw = payload["condicao_pagamento"].strip()
                cond_text = ""
                desc_part = cond_raw
                
                # Separar condição de pagamento (ex: "02 DIAS", "A VISTA") da descrição do banco
                if cond_raw:
                    cond_tokens = cond_raw.split()
                    cond_count = 0
                    
                    # Verifica se termina com "DIAS" (ex: "02 DIAS", "7 DIAS")
                    if len(cond_tokens) >= 2 and cond_tokens[-1].upper() == "DIAS":
                        cond_count = 2
                    # Verifica se termina com "A VISTA"
                    elif (
                        len(cond_tokens) >= 2
                        and cond_tokens[-2].upper() == "A"
                        and cond_tokens[-1].upper() == "VISTA"
                    ):
                        cond_count = 2
                    # Verifica se termina com fração (ex: "30/60")
                    elif len(cond_tokens) >= 1 and re.match(r"^\d+/\d+$", cond_tokens[-1]):
                        cond_count = 1
                    
                    if cond_count:
                        # Últimos tokens são a condição de pagamento
                        cond_text = " ".join(cond_tokens[-cond_count:])
                        # Tokens restantes são a descrição do banco
                        desc_part = " ".join(cond_tokens[:-cond_count])
                    else:
                        # Se não encontrou padrão de condição, tudo é descrição
                        desc_part = cond_raw
                        cond_text = ""
                
                # Montar tipo de cobrança completo: código + descrição do banco
                tipo_desc = desc_part.strip()
                tipo_code = payload["tipo_cobranca"].strip().upper()
                
                # Se não temos descrição do banco, usar o mapeamento para expandir a sigla
                if not tipo_desc:
                    tipo_desc = expand_payment_type(tipo_code)
                
                # Montar tipo completo: "SIGLA - NOME COMPLETO"
                if tipo_desc and tipo_desc != tipo_code:
                    tipo_full = f"{tipo_code} - {tipo_desc}"
                else:
                    tipo_full = tipo_code
                entry = {
                    "data_vencimento": payload["data_vencimento"],
                    "data_emissao": payload["data_emissao"],
                    "numero_nf": payload["numero_nf"],
                    "tipo_cobranca": tipo_full,
                    "condicao_pagamento": cond_text,
                    "valor": payload["valor"],
                    "valor_pago": payload["valor_pago"],
                    "valor_pendente": payload["valor_pendente"],
                    "dias_vencidos": int(payload["dias_vencidos"]),
                    "page": page_num,
                    "line": line_num,
                    "valor_decimal": str(parse_amount(payload["valor"])),
                    "valor_pago_decimal": str(parse_amount(payload["valor_pago"])),
                    "valor_pendente_decimal": str(parse_amount(payload["valor_pendente"])),
                }
                current_client["entries"].append(entry)
                current_client["page_numbers"].add(page_num)
    finalize_client()
    return {"pdf": path.name, "clients": clients}


def expand_paths(paths: Iterable[Path]) -> list[Path]:
    resolved: list[Path] = []
    for path in paths:
        if path.exists():
            resolved.append(path)
            continue
        if not any(ch in path.name for ch in "*?[]"):
            raise FileNotFoundError(path)
        matches = sorted(path.parent.glob(path.name))
        if not matches:
            raise FileNotFoundError(path)
        resolved.extend(matches)
    return resolved


def collect_documents(paths: Iterable[Path]) -> list[dict]:
    resolved_paths = expand_paths(paths)
    return [parse_pdf(path) for path in resolved_paths]


JSON_ENTRY_FIELDS = (
    "data_vencimento",
    "data_emissao",
    "numero_nf",
    "tipo_cobranca",
    "condicao_pagamento",
    "valor",
    "valor_pago",
    "valor_pendente",
    "dias_vencidos",
)


def flatten_entries(documents: Sequence[dict]) -> Iterable[dict]:
    for document in documents:
        for client in document["clients"]:
            for entry in client["entries"]:
                row = {
                    "pdf": document["pdf"],
                    "client_code": client["client_code"],
                    "client_name": client["client_name"],
                    "data_vencimento": entry["data_vencimento"],
                    "data_emissao": entry["data_emissao"],
                    "numero_nf": entry["numero_nf"],
                    "tipo_cobranca": entry["tipo_cobranca"],
                    "condicao_pagamento": entry["condicao_pagamento"],
                    "valor": entry["valor"],
                    "valor_pago": entry["valor_pago"],
                    "valor_pendente": entry["valor_pendente"],
                    "dias_vencidos": entry["dias_vencidos"],
                    "page": entry["page"],
                    "line": entry["line"],
                    "valor_decimal": entry["valor_decimal"],
                    "valor_pago_decimal": entry["valor_pago_decimal"],
                    "valor_pendente_decimal": entry["valor_pendente_decimal"],
                }
                yield row


def write_csv(entries: Iterable[dict], dest):
    fieldnames = [
        "pdf",
        "page",
        "line",
        "client_code",
        "client_name",
        "data_vencimento",
        "data_emissao",
        "numero_nf",
        "tipo_cobranca",
        "condicao_pagamento",
        "valor",
        "valor_pago",
        "valor_pendente",
        "dias_vencidos",
        "valor_decimal",
        "valor_pago_decimal",
        "valor_pendente_decimal",
    ]
    writer = csv.DictWriter(dest, fieldnames=fieldnames)
    writer.writeheader()
    for entry in entries:
        writer.writerow({k: entry.get(k, "") for k in fieldnames})


def write_json(documents: Sequence[dict], dest):
    output: list[dict] = []
    for document in documents:
        clients_out: list[dict] = []
        for client in document["clients"]:
            entries_out = [
                {field: entry[field] for field in JSON_ENTRY_FIELDS}
                for entry in client["entries"]
            ]
            clients_out.append(
                {
                    "client_code": client["client_code"],
                    "client_name": client["client_name"],
                    "entries": entries_out,
                    "totals": client["totals"],
                    "page_numbers": client["page_numbers"],
                }
            )
        output.append(
            {"pdf": document["pdf"], "clients": clients_out}
        )
    dest.write(json.dumps(output, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="Extrai os titulos vencidos dos PDFs.")
    parser.add_argument(
        "pdfs",
        nargs="+",
        type=Path,
        help="Arquivos PDF a serem analisados.",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        help="Arquivo de saida (CSV ou JSON). Se omitido, escreve para stdout.",
    )
    parser.add_argument(
        "--format",
        choices=("csv", "json"),
        default="json",
        help="Formato de saida (padrao json).",
    )
    args = parser.parse_args()

    documents = collect_documents(args.pdfs)
    if args.format == "csv":
        payload = flatten_entries(documents)
        writer = write_csv
    else:
        payload = documents
        writer = write_json

    target = args.output.open("w", encoding="utf-8") if args.output else None
    try:
        if target:
            writer(payload, target)
        else:
            writer(payload, dest=sys.stdout)
    finally:
        if target:
            target.close()


if __name__ == "__main__":
    main()
