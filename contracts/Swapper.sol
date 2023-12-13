// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.17;
pragma abicoder v2;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@opengsn/contracts/src/ERC2771Recipient.sol";

interface IDAI {
    function permit(address holder, address spender, uint256 nonce, uint256 expiry, bool allowed, uint8 v, bytes32 r, bytes32 s) external;
    function transferFrom(address src, address dst, uint wad) external returns (bool);
    function approve(address usr, uint wad) external returns (bool);
    function transfer(address dst, uint wad) external returns (bool);
}

interface IWETH {
    function withdraw(uint wad) external;
    function balanceOf(address usr) external returns (uint256);
    function approve(address guy, uint wad) external returns (bool);
}

contract Swapper is ERC2771Recipient {
    address public DaiContractAddress;
    address public WethContractAddress;
    ISwapRouter public immutable swapRouter;

    uint24 public constant poolFee = 3000;

    constructor(ISwapRouter _swapRouter, address _forwarder, address _daiContractAddress, address _WethContractAddress) {
        swapRouter = _swapRouter;
        _setTrustedForwarder(_forwarder); 
        DaiContractAddress = _daiContractAddress;
        WethContractAddress = _WethContractAddress;
    }

    function transferDAI(address holder, address spender, uint256 nonce, uint256 expiry, bool allowed, uint8 v, bytes32 r, bytes32 s, address recipient, uint256 daiAmount) external{
        IDAI(DaiContractAddress).permit(holder, spender, nonce, expiry, allowed, v, r, s);
        IDAI(DaiContractAddress).transferFrom(_msgSender(), recipient, daiAmount);
    }

    function exactOutputSwapDAIforETH(address holder, address spender, uint256 nonce, uint256 expiry, bool allowed, uint8 v, bytes32 r, bytes32 s, uint256 ethAmountOut, uint256 daiAmountInMaximum) external returns (uint256 amountIn) {
        IDAI(DaiContractAddress).permit(holder, spender, nonce, expiry, allowed, v, r, s);
        IDAI(DaiContractAddress).transferFrom(_msgSender(), address(this), daiAmountInMaximum);

        IDAI(DaiContractAddress).approve(address(swapRouter), daiAmountInMaximum);

        ISwapRouter.ExactOutputSingleParams memory params =
            ISwapRouter.ExactOutputSingleParams({
                tokenIn: DaiContractAddress,
                tokenOut: WethContractAddress,
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountOut: ethAmountOut,
                amountInMaximum: daiAmountInMaximum,
                sqrtPriceLimitX96: 0
            });

        amountIn = swapRouter.exactOutputSingle(params);

        // For exact output swaps, the amountInMaximum may not have all been spent.
        // If the actual amount spent (amountIn) is less than the specified maximum amount, we must refund the msg.sender and approve the swapRouter to spend 0.
        if (amountIn < daiAmountInMaximum) {
            IDAI(DaiContractAddress).approve(address(swapRouter), 0);
            IDAI(DaiContractAddress).transferFrom(address(this), _msgSender(), daiAmountInMaximum - amountIn);
        }

        if(ethAmountOut > 0) {
            IWETH(WethContractAddress).withdraw(ethAmountOut);
            payable(_msgSender()).transfer(ethAmountOut);
        }
    }

    receive() external payable {}

    fallback() external payable {}

}