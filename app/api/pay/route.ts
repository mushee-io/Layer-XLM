import { NextRequest, NextResponse } from 'next/server';
import { Horizon, Networks, Transaction } from '@stellar/stellar-sdk';

const server = new Horizon.Server('https://horizon-testnet.stellar.org');

export async function POST(req: NextRequest) {
  try {
    const { signedXdr } = await req.json();

    if (!signedXdr) {
      return NextResponse.json({ error: 'Missing signed transaction.' }, { status: 400 });
    }

    const treasury =
      process.env.TREASURY_STELLAR_ADDRESS ||
      'GAQJARPI6MTGTCX6BB7UZLLBQ2DCZCJDI47OHKUEGQBSJCDHTRSQOCY4';

    const requiredAmount = Number(
      process.env.NEXT_PUBLIC_PROMPT_COST_XLM || '0.01'
    ).toFixed(2);

    const tx = new Transaction(signedXdr, Networks.TESTNET);
    const op = tx.operations[0] as any;

    if (
      !op ||
      op.type !== 'payment' ||
      op.destination !== treasury ||
      op.asset?.isNative?.() !== true ||
      Number(op.amount).toFixed(2) !== requiredAmount
    ) {
      return NextResponse.json(
        { error: 'Transaction does not match the required testnet XLM payment.' },
        { status: 400 }
      );
    }

    const submitted = await server.submitTransaction(tx);

    return NextResponse.json({
      ok: true,
      hash: submitted.hash
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Payment submission failed.' },
      { status: 500 }
    );
  }
}
