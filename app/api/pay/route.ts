import { NextRequest, NextResponse } from 'next/server';
import { Horizon, Networks, TransactionBuilder, Operation, Asset } from '@stellar/stellar-sdk';

const server = new Horizon.Server('https://horizon-testnet.stellar.org');
const nativeAsset = Asset.native();

export async function POST(request: NextRequest) {
  try {
    const { signedXdr } = await request.json();
    const treasury = process.env.TREASURY_STELLAR_ADDRESS;
    const amount = Number(process.env.NEXT_PUBLIC_PROMPT_COST_XLM || '0.01').toFixed(2);

    if (!signedXdr || typeof signedXdr !== 'string') {
      return NextResponse.json({ error: 'Missing signed transaction XDR.' }, { status: 400 });
    }

    if (!treasury) {
      return NextResponse.json({ error: 'Missing TREASURY_STELLAR_ADDRESS.' }, { status: 500 });
    }

    const tx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
    const payment = tx.operations.find(
      (operation) =>
        operation.type === 'payment' &&
        (operation as any).destination === treasury &&
        (operation as any).asset.getCode?.() === nativeAsset.getCode() &&
        (operation as any).amount === amount
    ) as Operation.Payment | undefined;

    if (!payment) {
      return NextResponse.json({ error: 'Transaction does not match the required testnet XLM payment.' }, { status: 400 });
    }

    const result = await server.submitTransaction(tx);
    return NextResponse.json({ hash: result.hash, successful: result.successful });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Payment submission failed.' }, { status: 500 });
  }
}
